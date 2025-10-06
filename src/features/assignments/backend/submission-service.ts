import { formatISO, isAfter } from "date-fns";
import { match } from "ts-pattern";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import type { AppLogger } from "@/backend/hono/context";
import {
  AssignmentSubmissionRequestSchema,
  AssignmentSubmissionResponseSchema,
  type AssignmentSubmissionRequest,
  type AssignmentSubmissionResponse,
} from "@/features/assignments/backend/submission-schema";
import {
  fetchAssignmentSummary,
  fetchEnrollmentSummary,
  fetchSubmission,
  fetchUserProfileByAuthId,
  upsertSubmission,
} from "@/features/assignments/backend/submission-repository";
import {
  assignmentSubmissionErrorCodes,
  type AssignmentSubmissionErrorCode,
} from "@/features/assignments/backend/submission-error";

export type SubmitAssignmentDeps = {
  supabase: SupabaseClient;
  logger: AppLogger;
  now?: () => Date;
};

export const submitAssignment = async (
  { supabase, logger, now = () => new Date() }: SubmitAssignmentDeps,
  assignmentId: string,
  payload: unknown,
): Promise<
  HandlerResult<AssignmentSubmissionResponse, AssignmentSubmissionErrorCode, unknown>
> => {
  const parsedPayload = AssignmentSubmissionRequestSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return failure(
      400,
      assignmentSubmissionErrorCodes.invalidPayload,
      "제출 요청 형식이 올바르지 않습니다.",
      parsedPayload.error.format(),
    );
  }

  const submissionPayload: AssignmentSubmissionRequest = parsedPayload.data;

  try {
    const userProfile = await fetchUserProfileByAuthId(
      supabase,
      submissionPayload.authUserId,
    );

    if (!userProfile) {
      return failure(
        404,
        assignmentSubmissionErrorCodes.learnerNotFound,
        "학습자 프로필을 찾을 수 없습니다.",
      );
    }

    if (userProfile.role !== "learner") {
      return failure(
        403,
        assignmentSubmissionErrorCodes.notLearnerRole,
        "학습자만 과제를 제출할 수 있습니다.",
      );
    }

    const assignment = await fetchAssignmentSummary(supabase, assignmentId);

    if (!assignment) {
      return failure(
        404,
        assignmentSubmissionErrorCodes.assignmentNotFound,
        "존재하지 않는 과제입니다.",
      );
    }

    if (assignment.status === "draft") {
      return failure(
        403,
        assignmentSubmissionErrorCodes.assignmentNotPublished,
        "아직 게시되지 않은 과제입니다.",
      );
    }

    if (assignment.status === "closed") {
      return failure(
        403,
        assignmentSubmissionErrorCodes.assignmentClosed,
        "마감된 과제입니다.",
      );
    }

    const enrollment = await fetchEnrollmentSummary(
      supabase,
      userProfile.id,
      assignment.course_id,
    );

    if (!enrollment || enrollment.status !== "active") {
      return failure(
        403,
        assignmentSubmissionErrorCodes.enrollmentInactive,
        "해당 코스에 활성화된 수강 정보가 없습니다.",
      );
    }

    const submittedAt = formatISO(now());
    const dueDate = new Date(assignment.due_at);
    const isLateAttempt = isAfter(new Date(submittedAt), dueDate);

    if (isLateAttempt && !assignment.late_submission_allowed) {
      return failure(
        403,
        assignmentSubmissionErrorCodes.lateNotAllowed,
        "마감 기한이 지난 과제는 제출할 수 없습니다.",
      );
    }

    const existingSubmission = await fetchSubmission(
      supabase,
      assignment.id,
      userProfile.id,
    );

    const upserted = await upsertSubmission(supabase, {
      assignmentId: assignment.id,
      learnerId: userProfile.id,
      submissionText: submissionPayload.submissionText,
      submissionLink: submissionPayload.submissionLink,
      status: "submitted",
      submittedAt,
      late: assignment.late_submission_allowed && isLateAttempt,
    });

    const response = AssignmentSubmissionResponseSchema.parse({
      submissionId: upserted.id,
      assignmentId: upserted.assignment_id,
      learnerId: upserted.learner_id,
      status: upserted.status,
      submittedAt: upserted.submitted_at,
      late: upserted.late,
      isResubmission: Boolean(existingSubmission),
      message: match({
        isResubmission: Boolean(existingSubmission),
        late: upserted.late,
      })
        .with({ isResubmission: true, late: true }, () => "지각 재제출이 완료되었습니다.")
        .with({ isResubmission: true, late: false }, () => "재제출이 완료되었습니다.")
        .with({ isResubmission: false, late: true }, () => "지각 제출이 완료되었습니다.")
        .otherwise(() => "제출이 완료되었습니다."),
      previousStatus: existingSubmission?.status ?? null,
    });

    return success(response, existingSubmission ? 200 : 201);
  } catch (error) {
    logger.error(error);

    return failure(
      500,
      assignmentSubmissionErrorCodes.repositoryError,
      "제출 처리 중 문제가 발생했습니다.",
      error instanceof Error ? error.message : error,
    );
  }
};
