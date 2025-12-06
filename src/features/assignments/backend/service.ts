import type { SupabaseClient } from '@supabase/supabase-js';
import { parseISO, isAfter } from 'date-fns';
import {
  failure,
  success,
  type ErrorResult,
  type HandlerResult,
} from '@/backend/http/response';
import {
  AssignmentDetailResponseSchema,
  type AssignmentDetailParams,
  type AssignmentDetailResponse,
} from '@/features/assignments/backend/schema';
import {
  assignmentErrorCodes,
  type AssignmentServiceError,
} from '@/features/assignments/backend/error';
import {
  getAccessibleAssignment,
  getActiveEnrollment,
  getLatestSubmission,
} from '@/features/assignments/backend/repository';

const toNumber = (value: string | number | null) => {
  if (value === null) {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
};

export const getAssignmentDetail = async (
  client: SupabaseClient,
  params: AssignmentDetailParams,
): Promise<
  HandlerResult<AssignmentDetailResponse, AssignmentServiceError, unknown>
> => {
  const enrollmentResult = await getActiveEnrollment(client, {
    learnerId: params.learnerId,
    courseId: params.courseId,
  });


if (!enrollmentResult.ok) {
  const { status, error } = enrollmentResult as ErrorResult<AssignmentServiceError, unknown>;

  return failure(status, error.code, error.message, error.details);
}

  const assignmentResult = await getAccessibleAssignment(client, {
    courseId: params.courseId,
    assignmentId: params.assignmentId,
  });


if (!assignmentResult.ok) {
  const { status, error } = assignmentResult as ErrorResult<AssignmentServiceError, unknown>;

  return failure(status, error.code, error.message, error.details);
}

  const assignmentRow = assignmentResult.data;

  if (assignmentRow.status === 'draft') {
    return failure(
      403,
      assignmentErrorCodes.assignmentNotAccessible,
      'This assignment is not published.',
    );
  }

  const dueDate = parseISO(assignmentRow.due_at);

  if (Number.isNaN(dueDate.getTime())) {
    return failure(
      500,
      assignmentErrorCodes.validationError,
      'Unable to parse assignment due date.',
    );
  }

  const scoreWeight = toNumber(assignmentRow.score_weight);

  if (scoreWeight === null) {
    return failure(
      500,
      assignmentErrorCodes.validationError,
      'Assignment score weight is invalid.',
    );
  }

  const now = new Date();
  const isPastDue = isAfter(now, dueDate);
  const isClosed = assignmentRow.status === 'closed';

  let canSubmit = true;

  if (isClosed) {
    canSubmit = false;
  } else if (isPastDue && !assignmentRow.late_submission_allowed) {
    canSubmit = false;
  }

  const submissionResult = await getLatestSubmission(client, {
    assignmentId: params.assignmentId,
    learnerId: params.learnerId,
  });


if (!submissionResult.ok) {
  const { status, error } = submissionResult as ErrorResult<AssignmentServiceError, unknown>;

  return failure(status, error.code, error.message, error.details);
}

  const submissionRow = submissionResult.data;

  const submission = submissionRow
    ? {
        id: submissionRow.id,
        assignmentId: submissionRow.assignment_id,
        learnerId: submissionRow.learner_id,
        submissionText: submissionRow.submission_text,
        submissionLink: submissionRow.submission_link,
        status: submissionRow.status,
        late: submissionRow.late,
        score: toNumber(submissionRow.score),
        feedbackText: submissionRow.feedback_text,
        submittedAt: submissionRow.submitted_at,
        gradedAt: submissionRow.graded_at,
        feedbackUpdatedAt: submissionRow.feedback_updated_at,
        createdAt: submissionRow.created_at,
        updatedAt: submissionRow.updated_at,
      }
    : null;

  if (submission && submission.score === null && submissionRow?.score !== null) {
    return failure(
      500,
      assignmentErrorCodes.validationError,
      'Submission score format is invalid.',
    );
  }

  const response: AssignmentDetailResponse = {
    assignment: {
      id: assignmentRow.id,
      courseId: assignmentRow.course_id,
      title: assignmentRow.title,
      description: assignmentRow.description,
      dueAt: assignmentRow.due_at,
      scoreWeight,
      instructions: assignmentRow.instructions,
      submissionRequirements: assignmentRow.submission_requirements,
      lateSubmissionAllowed: assignmentRow.late_submission_allowed,
      status: assignmentRow.status,
    },
    submission,
    canSubmit,
    isLate: isPastDue || isClosed,
  };

  const parsedResponse = AssignmentDetailResponseSchema.safeParse(response);

  if (!parsedResponse.success) {
    return failure(
      500,
      assignmentErrorCodes.validationError,
      'Assignment detail response is invalid.',
      parsedResponse.error.format(),
    );
  }

  return success(parsedResponse.data);
};
