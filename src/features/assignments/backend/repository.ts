import type { SupabaseClient } from "@supabase/supabase-js";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import {
  AssignmentTableRowSchema,
  EnrollmentTableRowSchema,
  SubmissionTableRowSchema,
  type AssignmentTableRow,
  type EnrollmentTableRow,
  type SubmissionTableRow,
} from "@/features/assignments/backend/schema";
import {
  assignmentErrorCodes,
  type AssignmentServiceError,
} from "@/features/assignments/backend/error";

const ENROLLMENTS_TABLE = "enrollments";
const ASSIGNMENTS_TABLE = "assignments";
const SUBMISSIONS_TABLE = "assignment_submissions";

const normalizeDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

type RepositoryResult<T> = Promise<
  HandlerResult<T, AssignmentServiceError, unknown>
>;

type EnrollmentParams = {
  learnerId: string;
  courseId: string;
};

type AssignmentParams = {
  courseId: string;
  assignmentId: string;
};

type SubmissionParams = {
  learnerId: string;
  assignmentId: string;
};

export const getActiveEnrollment = async (
  client: SupabaseClient,
  { learnerId, courseId }: EnrollmentParams,
): RepositoryResult<EnrollmentTableRow> => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select("id, learner_id, course_id, status")
    .eq("learner_id", learnerId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle<EnrollmentTableRow>();

  if (error) {
    return failure(
      500,
      assignmentErrorCodes.repositoryError,
      error.message,
      error,
    );
  }

  if (!data) {
    return failure(
      403,
      assignmentErrorCodes.enrollmentNotFound,
      "Active enrollment not found.",
    );
  }

  const parsed = EnrollmentTableRowSchema.safeParse(data);

  if (!parsed.success) {
    return failure(
      500,
      assignmentErrorCodes.validationError,
      "Enrollment row validation failed.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const getAccessibleAssignment = async (
  client: SupabaseClient,
  { courseId, assignmentId }: AssignmentParams,
): RepositoryResult<AssignmentTableRow> => {
  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .select(
      [
        "id",
        "course_id",
        "title",
        "description",
        "due_at",
        "score_weight",
        "instructions",
        "submission_requirements",
        "late_submission_allowed",
        "status",
      ].join(", "),
    )
    .eq("id", assignmentId)
    .eq("course_id", courseId)
    .in("status", ["published", "closed"])
    .maybeSingle<AssignmentTableRow>();

  if (error) {
    return failure(
      500,
      assignmentErrorCodes.repositoryError,
      error.message,
      error,
    );
  }

  if (!data) {
    return failure(
      404,
      assignmentErrorCodes.assignmentNotFound,
      "Assignment not found.",
    );
  }

  const normalized = {
    ...data,
    due_at: normalizeDateTime(data.due_at),
  };

  const parsed = AssignmentTableRowSchema.safeParse(normalized);

  if (!parsed.success) {
    return failure(
      500,
      assignmentErrorCodes.validationError,
      "Assignment row validation failed.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const getLatestSubmission = async (
  client: SupabaseClient,
  { learnerId, assignmentId }: SubmissionParams,
): RepositoryResult<SubmissionTableRow | null> => {
  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select(
      [
        "id",
        "assignment_id",
        "learner_id",
        "submission_text",
        "submission_link",
        "status",
        "late",
        "score",
        "feedback_text",
        "submitted_at",
        "graded_at",
        "feedback_updated_at",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("assignment_id", assignmentId)
    .eq("learner_id", learnerId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubmissionTableRow>();

  if (error) {
    return failure(
      500,
      assignmentErrorCodes.repositoryError,
      error.message,
      error,
    );
  }

  if (!data) {
    return success(null);
  }

  const parsed = SubmissionTableRowSchema.safeParse({
    ...data,
    submitted_at: normalizeDateTime(data.submitted_at),
    graded_at:
      typeof data.graded_at === "string"
        ? normalizeDateTime(data.graded_at)
        : data.graded_at,
    feedback_updated_at:
      typeof data.feedback_updated_at === "string"
        ? normalizeDateTime(data.feedback_updated_at)
        : data.feedback_updated_at,
    created_at: normalizeDateTime(data.created_at),
    updated_at: normalizeDateTime(data.updated_at),
  });

  if (!parsed.success) {
    return failure(
      500,
      assignmentErrorCodes.validationError,
      "Submission row validation failed.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};
