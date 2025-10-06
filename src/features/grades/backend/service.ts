import type { SupabaseClient } from "@supabase/supabase-js";
import { compareDesc, parseISO } from "date-fns";
import { match } from "ts-pattern";
import { z } from "zod";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import {
  AssignmentGradeSchema,
  CourseGradesParamsSchema,
  CourseGradesResponseSchema,
  GradesOverviewResponseSchema,
  GradeOverviewQuerySchema,
  SubmissionStatusSchema,
} from "@/features/grades/backend/schema";
import {
  fetchActiveLearnerEnrollments,
  fetchAssignmentsForCourses,
  fetchLearnerProfileByAuthUserId,
  fetchLearnerSubmissionsForAssignments,
  type AssignmentRecord,
  type EnrollmentRecord,
  type LearnerProfile,
  type SubmissionRecord,
} from "@/features/grades/backend/repository";
import {
  gradesErrorCodes,
  type GradesServiceError,
} from "@/features/grades/backend/error";

const PENDING_STATUSES = new Set<string>([
  SubmissionStatusSchema.Enum.submitted,
  SubmissionStatusSchema.Enum.resubmission_required,
]);

type GetGradesDeps = {
  supabase: SupabaseClient;
};

type ServiceContext = {
  accessToken?: string;
};

type CourseParams = z.infer<typeof CourseGradesParamsSchema>;

type LearnerContext = {
  learnerProfile: LearnerProfile;
  authUserId: string;
};

const getLatestSubmission = (
  submissions: readonly SubmissionRecord[],
): SubmissionRecord | null => {
  if (submissions.length === 0) {
    return null;
  }

  return [...submissions].sort((a, b) =>
    compareDesc(parseISO(a.updated_at), parseISO(b.updated_at)),
  )[0];
};

const groupAssignmentsByCourse = (
  assignments: readonly AssignmentRecord[],
): Map<string, AssignmentRecord[]> => {
  const courseMap = new Map<string, AssignmentRecord[]>();

  assignments.forEach((assignment) => {
    const existing = courseMap.get(assignment.course_id) ?? [];
    courseMap.set(assignment.course_id, [...existing, assignment]);
  });

  return courseMap;
};

const groupSubmissionsByAssignment = (
  submissions: readonly SubmissionRecord[],
): Map<string, SubmissionRecord[]> => {
  const submissionMap = new Map<string, SubmissionRecord[]>();

  submissions.forEach((submission) => {
    const existing = submissionMap.get(submission.assignment_id) ?? [];
    submissionMap.set(submission.assignment_id, [...existing, submission]);
  });

  return submissionMap;
};

const findLatestFeedback = (
  courseId: string,
  courseTitle: string,
  assignments: readonly AssignmentRecord[],
  submissionGroups: Map<string, SubmissionRecord[]>,
) => {
  const submissionsWithFeedback = assignments
    .flatMap((assignment) => {
      const submissions = submissionGroups.get(assignment.id) ?? [];

      return submissions
        .filter((submission) => Boolean(submission.feedback_updated_at))
        .map((submission) => ({ submission, assignment }));
    })
    .sort((a, b) =>
      compareDesc(
        parseISO(a.submission.feedback_updated_at ?? a.submission.updated_at),
        parseISO(b.submission.feedback_updated_at ?? b.submission.updated_at),
      ),
    );

  const latest = submissionsWithFeedback[0];

  if (!latest) {
    return null;
  }

  return {
    submissionId: latest.submission.id,
    assignmentId: latest.assignment.id,
    assignmentTitle: latest.assignment.title,
    courseId,
    courseTitle,
    score: latest.submission.score,
    feedbackText: latest.submission.feedback_text,
    feedbackUpdatedAt:
      latest.submission.feedback_updated_at ?? latest.submission.updated_at,
  };
};

type CourseComputation = {
  summary: {
    courseId: string;
    courseTitle: string;
    weightedScore: number | null;
    gradedCount: number;
    totalCount: number;
    pendingFeedbackCount: number;
    lateSubmissionCount: number;
    latestFeedback: ReturnType<typeof findLatestFeedback>;
  };
  totals: {
    gradedWeights: number;
    weightedScores: number;
    gradedAssignments: number;
    pendingAssignments: number;
    lateAssignments: number;
  };
};

const evaluateCourse = (
  enrollment: EnrollmentRecord,
  assignments: readonly AssignmentRecord[],
  submissionGroups: Map<string, SubmissionRecord[]>,
): CourseComputation => {
  let gradedWeights = 0;
  let weightedScores = 0;
  let gradedAssignments = 0;
  let pendingAssignments = 0;
  let lateAssignments = 0;

  assignments.forEach((assignment) => {
    const submissions = submissionGroups.get(assignment.id) ?? [];
    const latest = getLatestSubmission(submissions);

    if (latest?.score !== null && latest?.score !== undefined) {
      gradedAssignments += 1;
      if (assignment.score_weight > 0) {
        gradedWeights += assignment.score_weight;
        weightedScores += latest.score * assignment.score_weight;
      }
    }

    if (latest && PENDING_STATUSES.has(latest.status)) {
      pendingAssignments += 1;
    }

    if (latest?.late) {
      lateAssignments += 1;
    }
  });

  const weightedScore = gradedWeights > 0 ? weightedScores / gradedWeights : null;

  return {
    summary: {
      courseId: enrollment.courseId,
      courseTitle: enrollment.courseTitle,
      weightedScore,
      gradedCount: gradedAssignments,
      totalCount: assignments.length,
      pendingFeedbackCount: pendingAssignments,
      lateSubmissionCount: lateAssignments,
      latestFeedback: findLatestFeedback(
        enrollment.courseId,
        enrollment.courseTitle,
        assignments,
        submissionGroups,
      ),
    },
    totals: {
      gradedWeights,
      weightedScores,
      gradedAssignments,
      pendingAssignments,
      lateAssignments,
    },
  };
};

const buildAssignmentGrade = (
  assignment: AssignmentRecord,
  submissionGroups: Map<string, SubmissionRecord[]>,
) => {
  const submissions = submissionGroups.get(assignment.id) ?? [];
  const latest = getLatestSubmission(submissions);

  return AssignmentGradeSchema.parse({
    assignmentId: assignment.id,
    title: assignment.title,
    dueAt: assignment.due_at,
    scoreWeight: assignment.score_weight,
    submissionStatus:
      latest?.status ?? SubmissionStatusSchema.Enum.submitted,
    score: latest?.score ?? null,
    feedbackText: latest?.feedback_text ?? null,
    submittedAt: latest?.submitted_at ?? null,
    gradedAt: latest?.graded_at ?? null,
    feedbackUpdatedAt: latest?.feedback_updated_at ?? null,
    late: latest?.late ?? false,
  });
};

const resolveLearnerContext = async (
  client: SupabaseClient,
  context: ServiceContext,
): Promise<LearnerContext | null> => {
  if (!context.accessToken) {
    return null;
  }

  const { data, error } = await client.auth.getUser(context.accessToken);

  if (error || !data.user) {
    return null;
  }

  const profile = await fetchLearnerProfileByAuthUserId(client, data.user.id);

  if (!profile || profile.role !== "learner") {
    return null;
  }

  return {
    learnerProfile: profile,
    authUserId: data.user.id,
  };
};

export const getGradesOverview = async (
  { supabase }: GetGradesDeps,
  context: ServiceContext,
): Promise<
  HandlerResult<
    z.infer<typeof GradesOverviewResponseSchema>,
    GradesServiceError["code"],
    unknown
  >
> => {
  const learnerContext = await resolveLearnerContext(supabase, context);

  if (!learnerContext) {
    return failure(
      401,
      gradesErrorCodes.unauthorized,
      "성적 정보를 조회하려면 로그인 후 다시 시도해주세요.",
    );
  }

  const parsedQuery = GradeOverviewQuerySchema.safeParse({
    learnerId: learnerContext.learnerProfile.id,
  });

  if (!parsedQuery.success) {
    return failure(
      400,
      gradesErrorCodes.invalidQuery,
      "성적 정보를 조회할 수 없는 요청입니다.",
      parsedQuery.error.format(),
    );
  }

  let enrollments: EnrollmentRecord[] = [];

  try {
    enrollments = await fetchActiveLearnerEnrollments(
      supabase,
      parsedQuery.data.learnerId,
    );
  } catch (error) {
    return failure(
      500,
      gradesErrorCodes.enrollmentFetchFailed,
      "수강 중인 강좌 정보를 불러오지 못했습니다.",
      error instanceof Error ? error.message : error,
    );
  }

  const courseIds = enrollments.map((item) => item.courseId);

  let assignments: AssignmentRecord[] = [];

  try {
    assignments = await fetchAssignmentsForCourses(supabase, courseIds);
  } catch (error) {
    return failure(
      500,
      gradesErrorCodes.assignmentFetchFailed,
      "과제 정보를 불러오지 못했습니다.",
      error instanceof Error ? error.message : error,
    );
  }

  const assignmentIds = assignments.map((assignment) => assignment.id);
  let submissions: SubmissionRecord[] = [];

  try {
    submissions = await fetchLearnerSubmissionsForAssignments(
      supabase,
      assignmentIds,
      parsedQuery.data.learnerId,
    );
  } catch (error) {
    return failure(
      500,
      gradesErrorCodes.submissionFetchFailed,
      "제출 및 피드백 정보를 불러오지 못했습니다.",
      error instanceof Error ? error.message : error,
    );
  }

  const assignmentsByCourse = groupAssignmentsByCourse(assignments);
  const submissionsByAssignment = groupSubmissionsByAssignment(submissions);

  const computations = enrollments.map((enrollment) =>
    evaluateCourse(
      enrollment,
      assignmentsByCourse.get(enrollment.courseId) ?? [],
      submissionsByAssignment,
    ),
  );

  const aggregate = computations.reduce(
    (acc, computation) => ({
      gradedWeights: acc.gradedWeights + computation.totals.gradedWeights,
      weightedScores: acc.weightedScores + computation.totals.weightedScores,
      gradedAssignments: acc.gradedAssignments + computation.totals.gradedAssignments,
      pendingAssignments:
        acc.pendingAssignments + computation.totals.pendingAssignments,
      lateAssignments: acc.lateAssignments + computation.totals.lateAssignments,
    }),
    {
      gradedWeights: 0,
      weightedScores: 0,
      gradedAssignments: 0,
      pendingAssignments: 0,
      lateAssignments: 0,
    },
  );

  const parsedResponse = GradesOverviewResponseSchema.safeParse({
    learnerId: parsedQuery.data.learnerId,
    aggregate: {
      activeCourseCount: enrollments.length,
      gradedAssignmentCount: aggregate.gradedAssignments,
      pendingFeedbackCount: aggregate.pendingAssignments,
      lateSubmissionCount: aggregate.lateAssignments,
      averageScore:
        aggregate.gradedWeights > 0
          ? aggregate.weightedScores / aggregate.gradedWeights
          : null,
    },
    courses: computations.map((item) => item.summary),
  });

  if (!parsedResponse.success) {
    return failure(
      500,
      gradesErrorCodes.responseValidationFailed,
      "성적 요약 데이터를 검증하지 못했습니다.",
      parsedResponse.error.format(),
    );
  }

  return success(parsedResponse.data);
};

export const getCourseGrades = async (
  { supabase }: GetGradesDeps,
  params: CourseParams,
  context: ServiceContext,
): Promise<
  HandlerResult<
    z.infer<typeof CourseGradesResponseSchema>,
    GradesServiceError["code"],
    unknown
  >
> => {
  const learnerContext = await resolveLearnerContext(supabase, context);

  if (!learnerContext) {
    return failure(
      401,
      gradesErrorCodes.unauthorized,
      "성적 정보를 조회하려면 로그인 후 다시 시도해주세요.",
    );
  }

  const parsedParams = CourseGradesParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    return failure(
      400,
      gradesErrorCodes.invalidQuery,
      "강의별 성적 조회 요청이 올바르지 않습니다.",
      parsedParams.error.format(),
    );
  }

  const parsedQuery = GradeOverviewQuerySchema.safeParse({
    learnerId: learnerContext.learnerProfile.id,
  });

  if (!parsedQuery.success) {
    return failure(
      400,
      gradesErrorCodes.invalidQuery,
      "수강 중인 학습자 정보를 확인할 수 없습니다.",
      parsedQuery.error.format(),
    );
  }

  let enrollments: EnrollmentRecord[] = [];

  try {
    enrollments = await fetchActiveLearnerEnrollments(
      supabase,
      parsedQuery.data.learnerId,
    );
  } catch (error) {
    return failure(
      500,
      gradesErrorCodes.enrollmentFetchFailed,
      "수강 중인 강좌 정보를 불러오지 못했습니다.",
      error instanceof Error ? error.message : error,
    );
  }

  const targetEnrollment = enrollments.find(
    (enrollment) => enrollment.courseId === parsedParams.data.courseId,
  );

  if (!targetEnrollment) {
    return failure(
      404,
      gradesErrorCodes.courseNotFound,
      "수강 중인 강좌에서 성적 정보를 찾을 수 없습니다.",
    );
  }

  let assignments: AssignmentRecord[] = [];

  try {
    assignments = await fetchAssignmentsForCourses(supabase, [
      parsedParams.data.courseId,
    ]);
  } catch (error) {
    return failure(
      500,
      gradesErrorCodes.assignmentFetchFailed,
      "과제 정보를 불러오지 못했습니다.",
      error instanceof Error ? error.message : error,
    );
  }

  const assignmentIds = assignments.map((assignment) => assignment.id);
  let submissions: SubmissionRecord[] = [];

  try {
    submissions = await fetchLearnerSubmissionsForAssignments(
      supabase,
      assignmentIds,
      parsedQuery.data.learnerId,
    );
  } catch (error) {
    return failure(
      500,
      gradesErrorCodes.submissionFetchFailed,
      "제출 및 피드백 정보를 불러오지 못했습니다.",
      error instanceof Error ? error.message : error,
    );
  }

  const submissionGroups = groupSubmissionsByAssignment(submissions);
  const assignmentsWithGrades = assignments.map((assignment) =>
    buildAssignmentGrade(assignment, submissionGroups),
  );

  const gradedAssignments = assignmentsWithGrades.filter(
    (assignment) => assignment.score !== null && assignment.score !== undefined,
  );

  const gradedWeights = gradedAssignments.reduce((total, assignment) => {
    const source = assignments.find((item) => item.id === assignment.assignmentId);
    return source && source.score_weight > 0
      ? total + source.score_weight
      : total;
  }, 0);

  const weightedScores = gradedAssignments.reduce((total, assignment) => {
    if (assignment.score === null) {
      return total;
    }

    const source = assignments.find((item) => item.id === assignment.assignmentId);

    if (!source || source.score_weight <= 0) {
      return total;
    }

    return total + assignment.score * source.score_weight;
  }, 0);

  const parsedResponse = CourseGradesResponseSchema.safeParse({
    courseId: targetEnrollment.courseId,
    courseTitle: targetEnrollment.courseTitle,
    weightedScore: gradedWeights > 0 ? weightedScores / gradedWeights : null,
    gradedCount: gradedAssignments.length,
    totalCount: assignments.length,
    pendingFeedbackCount: assignmentsWithGrades.filter((assignment) =>
      PENDING_STATUSES.has(assignment.submissionStatus)
    ).length,
    lateSubmissionCount: assignmentsWithGrades.filter((assignment) => assignment.late)
      .length,
    assignments: assignmentsWithGrades,
  });

  if (!parsedResponse.success) {
    return failure(
      500,
      gradesErrorCodes.responseValidationFailed,
      "강좌 성적 데이터를 검증하지 못했습니다.",
      parsedResponse.error.format(),
    );
  }

  return success(parsedResponse.data);
};
