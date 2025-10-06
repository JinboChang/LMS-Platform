import { addHours, isAfter, isBefore, parseISO } from 'date-fns';
import { groupBy } from 'es-toolkit/array';
import { match } from 'ts-pattern';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import type { AppLogger } from '@/backend/hono/context';
import {
  DashboardOverviewResponseSchema,
  type DashboardOverviewResponse,
  type AssignmentRow,
  type SubmissionRow,
} from '@/features/dashboard/backend/schema';
import {
  fetchActiveEnrollments,
  fetchLearnerSubmissions,
  fetchPublishedAssignments,
  type FetchedEnrollment,
} from '@/features/dashboard/backend/repository';
import {
  dashboardErrorCodes,
  type DashboardServiceError,
} from '@/features/dashboard/backend/error';

const UPCOMING_ASSIGNMENT_WINDOW_HOURS = 48;
const RECENT_FEEDBACK_LIMIT = 3;
const MAX_PROGRESS_PERCENTAGE = 100;

const buildCourseCoverUrl = (courseId: string) =>
  `https://picsum.photos/seed/course-${encodeURIComponent(courseId)}/960/540`;

const isCourseAssignmentCompleted = (submission: SubmissionRow | undefined) =>
  match(submission?.status)
    .with('graded', () => true)
    .with('submitted', () => true)
    .with('resubmission_required', () => false)
    .otherwise(() => false);

const selectRecentFeedbackTimestamp = (submission: SubmissionRow) => {
  const sources = [submission.feedback_updated_at, submission.graded_at, submission.submitted_at];
  const firstAvailable = sources.find((value) => Boolean(value));
  return firstAvailable ?? submission.submitted_at;
};

const clampProgress = (value: number) => {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > MAX_PROGRESS_PERCENTAGE) {
    return MAX_PROGRESS_PERCENTAGE;
  }

  return Math.round(value);
};

type ServiceDeps = {
  client: SupabaseClient;
  logger: AppLogger;
};

type ServiceArgs = ServiceDeps & {
  learnerId: string;
};

export const getDashboardOverview = async ({
  client,
  logger,
  learnerId,
}: ServiceArgs): Promise<
  HandlerResult<DashboardOverviewResponse, DashboardServiceError, unknown>
> => {
  let enrollments: FetchedEnrollment[];

  try {
    enrollments = await fetchActiveEnrollments(client, learnerId);
  } catch (error) {
    logger.error('Failed to fetch active enrollments for dashboard.', error);
    return failure(
      500,
      dashboardErrorCodes.enrollmentFetchFailed,
      'Failed to load learner dashboard overview.',
    );
  }

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);

  let assignments: AssignmentRow[];

  try {
    assignments = await fetchPublishedAssignments({ client, courseIds });
  } catch (error) {
    logger.error('Failed to fetch published assignments for dashboard.', error);
    return failure(
      500,
      dashboardErrorCodes.assignmentFetchFailed,
      'Failed to load assignment information.',
    );
  }

  const assignmentsById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const assignmentIds = assignments.map((assignment) => assignment.id);

  let submissions: SubmissionRow[];

  try {
    submissions = await fetchLearnerSubmissions({
      client,
      assignmentIds,
      learnerId,
    });
  } catch (error) {
    logger.error('Failed to fetch learner submissions for dashboard.', error);
    return failure(
      500,
      dashboardErrorCodes.submissionFetchFailed,
      'Failed to load submission information.',
    );
  }

  const assignmentsByCourse = groupBy(assignments, (assignment) => assignment.course_id);
  const submissionsByAssignment = groupBy(
    submissions,
    (submission) => submission.assignment_id,
  );
  const courseTitleMap = new Map(enrollments.map((item) => [item.courseId, item.courseTitle]));

  const now = new Date();
  const upcomingCutoff = addHours(now, UPCOMING_ASSIGNMENT_WINDOW_HOURS);

  const courses = enrollments.map((enrollment) => {
    const courseAssignments = assignmentsByCourse[enrollment.courseId] ?? [];

    const totalAssignments = courseAssignments.length;
    const completedAssignments = courseAssignments.filter((assignment) => {
      const submission = submissionsByAssignment[assignment.id]?.[0];
      return isCourseAssignmentCompleted(submission);
    }).length;

    const nextDueAt = courseAssignments
      .map((assignment) => assignment.due_at)
      .map((dueAt) => ({ dueAt, value: parseISO(dueAt) }))
      .filter(({ value }) => isAfter(value, now))
      .sort((a, b) => a.value.getTime() - b.value.getTime())
      .at(0)?.dueAt ?? null;

    const progress = totalAssignments === 0
      ? 0
      : clampProgress((completedAssignments / totalAssignments) * MAX_PROGRESS_PERCENTAGE);

    return {
      id: enrollment.courseId,
      title: enrollment.courseTitle,
      coverImageUrl: buildCourseCoverUrl(enrollment.courseId),
      progressPercentage: progress,
      completedAssignments,
      totalAssignments,
      nextDueAt,
    };
  });

  const upcomingAssignments = assignments
    .map((assignment) => ({
      assignment,
      dueDate: parseISO(assignment.due_at),
    }))
    .filter(({ dueDate }) => isAfter(dueDate, now) && isBefore(dueDate, upcomingCutoff))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .map(({ assignment }) => {
      const courseTitle = courseTitleMap.get(assignment.course_id) ?? assignment.course_id;

      return {
        id: assignment.id,
        courseId: assignment.course_id,
        courseTitle,
        title: assignment.title,
        dueAt: assignment.due_at,
        lateSubmissionAllowed: assignment.late_submission_allowed,
      };
    });

  const recentFeedback = submissions
    .filter((submission) =>
      Boolean(submission.feedback_text || submission.score || submission.feedback_updated_at),
    )
    .map((submission) => ({
      submission,
      timestamp: parseISO(selectRecentFeedbackTimestamp(submission)),
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, RECENT_FEEDBACK_LIMIT)
    .map(({ submission }) => {
      const assignment = assignmentsById.get(submission.assignment_id);
      const courseId = assignment?.course_id ?? submission.assignment_id;
      const courseTitle = courseTitleMap.get(courseId) ?? courseId;

      return {
        submissionId: submission.id,
        assignmentId: submission.assignment_id,
        assignmentTitle: assignment?.title ?? submission.assignment_id,
        courseId,
        courseTitle,
        score: submission.score,
        feedbackText: submission.feedback_text,
        feedbackUpdatedAt: selectRecentFeedbackTimestamp(submission),
      };
    });

  const averageProgress = courses.length === 0
    ? 0
    : clampProgress(
        courses.reduce((total, course) => total + course.progressPercentage, 0) /
          courses.length,
      );

  const responseCandidate = {
    summary: {
      activeCourseCount: courses.length,
      averageProgress,
      upcomingAssignmentCount: upcomingAssignments.length,
    },
    courses,
    upcomingAssignments,
    recentFeedback,
  } satisfies DashboardOverviewResponse;

  const validation = DashboardOverviewResponseSchema.safeParse(responseCandidate);

  if (!validation.success) {
    logger.error('Dashboard overview payload failed validation.', validation.error);
    return failure(
      500,
      dashboardErrorCodes.responseValidationFailed,
      'Failed to validate dashboard overview payload.',
      validation.error.format(),
    );
  }

  return success(validation.data);
};