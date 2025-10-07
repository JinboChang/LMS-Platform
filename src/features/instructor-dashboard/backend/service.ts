import { compareDesc, parseISO, subDays } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import type { AppLogger } from '@/backend/hono/context';
import {
  INSTRUCTOR_DASHBOARD_PENDING_DISPLAY_LIMIT,
  INSTRUCTOR_DASHBOARD_PENDING_FETCH_LIMIT,
  INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_DISPLAY_LIMIT,
  INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_FETCH_LIMIT,
  INSTRUCTOR_DASHBOARD_RECENT_WINDOW_DAYS,
} from '@/features/instructor-dashboard/constants';
import {
  InstructorDashboardResponseSchema,
  type CourseRow,
  type InstructorCourse,
  type InstructorDashboardResponse,
  type SubmissionWithRelations,
} from '@/features/instructor-dashboard/backend/schema';
import {
  fetchAssignmentsForCourses,
  fetchInstructorCourses,
  fetchPendingSubmissionsForInstructor,
  fetchSubmissionsForInstructor,
} from '@/features/instructor-dashboard/backend/repository';
import {
  instructorDashboardErrorCodes,
  type InstructorDashboardServiceError,
} from '@/features/instructor-dashboard/backend/error';

const buildCourseViewModel = (
  course: CourseRow,
  assignmentCount: number,
  pendingGradingCount: number,
): InstructorCourse => ({
  id: course.id,
  title: course.title,
  status: course.status,
  assignmentCount,
  pendingGradingCount,
  updatedAt: course.updated_at,
});

type ServiceDeps = {
  client: SupabaseClient;
  logger: AppLogger;
};

type ServiceArgs = ServiceDeps & {
  instructorId: string;
};

const mapPendingItem = (submission: SubmissionWithRelations) => ({
  submissionId: submission.id,
  assignmentId: submission.assignment_id,
  assignmentTitle: submission.assignments.title,
  courseId: submission.assignments.course_id,
  courseTitle: submission.assignments.courses.title,
  learnerId: submission.learner.id,
  learnerName: submission.learner.name,
  submittedAt: submission.submitted_at,
  status: submission.status,
  late: submission.late,
});

const mapRecentItem = (submission: SubmissionWithRelations) => ({
  ...mapPendingItem(submission),
  gradedAt: submission.graded_at,
  score: submission.score,
  feedbackText: submission.feedback_text,
});

const buildAssignmentCountByCourse = (assignments: readonly { course_id: string }[]) => {
  const result = new Map<string, number>();

  for (const assignment of assignments) {
    const previous = result.get(assignment.course_id) ?? 0;
    result.set(assignment.course_id, previous + 1);
  }

  return result;
};

const buildPendingCountByCourse = (
  submissions: readonly SubmissionWithRelations[],
) => {
  const result = new Map<string, number>();

  for (const submission of submissions) {
    const courseId = submission.assignments.course_id;
    const previous = result.get(courseId) ?? 0;
    result.set(courseId, previous + 1);
  }

  return result;
};

const sortCoursesByUpdatedAt = (courses: readonly CourseRow[]) =>
  [...courses].sort((left, right) =>
    compareDesc(parseISO(left.updated_at), parseISO(right.updated_at)),
  );

export const getInstructorDashboard = async ({
  client,
  logger,
  instructorId,
}: ServiceArgs): Promise<
  HandlerResult<InstructorDashboardResponse, InstructorDashboardServiceError, unknown>
> => {
  let courses: CourseRow[];

  try {
    courses = await fetchInstructorCourses(client, instructorId);
  } catch (error) {
    logger.error('Failed to fetch instructor courses for dashboard.', error);
    return failure(
      500,
      instructorDashboardErrorCodes.courseFetchFailed,
      'Failed to load instructor courses.',
    );
  }

  const courseIds = courses.map((course) => course.id);

  let assignments;

  try {
    assignments = await fetchAssignmentsForCourses({
      client,
      courseIds,
    });
  } catch (error) {
    logger.error('Failed to fetch assignments for instructor dashboard.', error);
    return failure(
      500,
      instructorDashboardErrorCodes.assignmentFetchFailed,
      'Failed to load course assignments.',
    );
  }

  let pendingSubmissions: SubmissionWithRelations[];

  try {
    pendingSubmissions = await fetchPendingSubmissionsForInstructor(
      client,
      instructorId,
      INSTRUCTOR_DASHBOARD_PENDING_FETCH_LIMIT,
    );
  } catch (error) {
    logger.error('Failed to fetch pending submissions for instructor dashboard.', error);
    return failure(
      500,
      instructorDashboardErrorCodes.pendingFetchFailed,
      'Failed to load pending grading queue.',
    );
  }

  const now = new Date();
  const recentSinceDate = subDays(now, INSTRUCTOR_DASHBOARD_RECENT_WINDOW_DAYS);
  const recentSince = recentSinceDate.toISOString();

  let recentSubmissions: SubmissionWithRelations[];

  try {
    recentSubmissions = await fetchSubmissionsForInstructor({
      client,
      instructorId,
      limit: INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_FETCH_LIMIT,
      submittedSince: recentSince,
      sortDirection: 'desc',
    });
  } catch (error) {
    logger.error('Failed to fetch recent submissions for instructor dashboard.', error);
    return failure(
      500,
      instructorDashboardErrorCodes.recentFetchFailed,
      'Failed to load recent submission history.',
    );
  }

  const assignmentCountByCourse = buildAssignmentCountByCourse(assignments);
  const pendingCountByCourse = buildPendingCountByCourse(pendingSubmissions);

  const buckets: InstructorDashboardResponse['courses']['buckets'] = {
    draft: [],
    published: [],
    archived: [],
  };

  for (const course of sortCoursesByUpdatedAt(courses)) {
    const assignmentCount = assignmentCountByCourse.get(course.id) ?? 0;
    const pendingCount = pendingCountByCourse.get(course.id) ?? 0;
    const viewModel = buildCourseViewModel(course, assignmentCount, pendingCount);

    buckets[viewModel.status].push(viewModel);
  }

  const pendingItems = pendingSubmissions
    .slice(0, INSTRUCTOR_DASHBOARD_PENDING_DISPLAY_LIMIT)
    .map(mapPendingItem);

  const recentItems = recentSubmissions
    .filter((item) => parseISO(item.submitted_at) >= recentSinceDate)
    .slice(0, INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_DISPLAY_LIMIT)
    .map(mapRecentItem);

  const normalizedBuckets: InstructorDashboardResponse['courses']['buckets'] = {
    draft: buckets.draft,
    published: buckets.published,
    archived: buckets.archived,
  };

  const responseCandidate = {
    courses: {
      totalCount: courses.length,
      buckets: normalizedBuckets,
    },
    pendingGrading: pendingItems,
    recentSubmissions: recentItems,
  } satisfies InstructorDashboardResponse;

  const validation = InstructorDashboardResponseSchema.safeParse(responseCandidate);

  if (!validation.success) {
    logger.error('Instructor dashboard response validation failed.', validation.error);
    return failure(
      500,
      instructorDashboardErrorCodes.responseValidationFailed,
      'Failed to validate instructor dashboard payload.',
      validation.error.format(),
    );
  }

  return success(validation.data);
};
