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
      "Submission payload is invalid.",
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
        "Learner profile not found.",
      );
    }

    if (userProfile.role !== "learner") {
      return failure(
        403,
        assignmentSubmissionErrorCodes.notLearnerRole,
        "Only learners can submit assignments.",
      );
    }

    const assignment = await fetchAssignmentSummary(supabase, assignmentId);

    if (!assignment) {
      return failure(
        404,
        assignmentSubmissionErrorCodes.assignmentNotFound,
        "Assignment not found.",
      );
    }

    if (assignment.status === "draft") {
      return failure(
        403,
        assignmentSubmissionErrorCodes.assignmentNotPublished,
        "Assignment is not published yet.",
      );
    }

    if (assignment.status === "closed") {
      return failure(
        403,
        assignmentSubmissionErrorCodes.assignmentClosed,
        "Assignment is closed.",
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
        "Active enrollment for this course is required.",
      );
    }

    const submittedAt = formatISO(now());
    const dueDate = new Date(assignment.due_at);
    const isLateAttempt = isAfter(new Date(submittedAt), dueDate);

    if (isLateAttempt && !assignment.late_submission_allowed) {
      return failure(
        403,
        assignmentSubmissionErrorCodes.lateNotAllowed,
        "Late submissions are not allowed for this assignment.",
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
        .with({ isResubmission: true, late: true }, () => "Late resubmission completed.")
        .with({ isResubmission: true, late: false }, () => "Resubmission completed.")
        .with({ isResubmission: false, late: true }, () => "Late submission completed.")
        .otherwise(() => "Submission completed."),
      previousStatus: existingSubmission?.status ?? null,
    });

    return success(response, existingSubmission ? 200 : 201);
  } catch (error) {
    logger.error(error);

    return failure(
      500,
      assignmentSubmissionErrorCodes.repositoryError,
      "An error occurred while processing the submission.",
      error instanceof Error ? error.message : error,
    );
  }
};
