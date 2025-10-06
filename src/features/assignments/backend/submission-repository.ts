import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AssignmentSubmissionRowSchema,
  AssignmentSummarySchema,
  EnrollmentSummarySchema,
  submissionStatuses,
  type AssignmentSubmissionRow,
  type AssignmentSummary,
  type EnrollmentSummary,
} from "@/features/assignments/backend/submission-schema";

const USERS_TABLE = "users";
const ASSIGNMENTS_TABLE = "assignments";
const ENROLLMENTS_TABLE = "enrollments";
const SUBMISSIONS_TABLE = "assignment_submissions";

const normalizeDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

const normalizeIfString = (value: unknown) =>
  typeof value === "string" ? normalizeDateTime(value) : value;

const UserProfileSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  role: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export type UpsertSubmissionInput = {
  assignmentId: string;
  learnerId: string;
  submissionText: string;
  submissionLink?: string;
  status: (typeof submissionStatuses)[number];
  submittedAt: string;
  late: boolean;
};

const normalizeSubmissionRow = (data: Record<string, unknown>) => ({
  ...data,
  submitted_at: normalizeIfString(data.submitted_at),
  graded_at: normalizeIfString(data.graded_at),
  feedback_updated_at: normalizeIfString(data.feedback_updated_at),
  created_at: normalizeIfString(data.created_at),
  updated_at: normalizeIfString(data.updated_at),
});

export const fetchUserProfileByAuthId = async (
  client: SupabaseClient,
  authUserId: string,
): Promise<UserProfile | null> => {
  const { data, error } = await client
    .from(USERS_TABLE)
    .select("id, auth_user_id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return UserProfileSchema.parse(data);
};

export const fetchAssignmentSummary = async (
  client: SupabaseClient,
  assignmentId: string,
): Promise<AssignmentSummary | null> => {
  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .select("id, course_id, status, due_at, late_submission_allowed")
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const normalized = {
    ...data,
    due_at: normalizeDateTime(data.due_at),
  };

  return AssignmentSummarySchema.parse(normalized);
};

export const fetchEnrollmentSummary = async (
  client: SupabaseClient,
  learnerId: string,
  courseId: string,
): Promise<EnrollmentSummary | null> => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select("id, learner_id, course_id, status")
    .eq("learner_id", learnerId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return EnrollmentSummarySchema.parse(data);
};

export const fetchSubmission = async (
  client: SupabaseClient,
  assignmentId: string,
  learnerId: string,
): Promise<AssignmentSubmissionRow | null> => {
  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select(
      "id, assignment_id, learner_id, submission_text, submission_link, status, late, submitted_at, graded_at, feedback_text, created_at, updated_at",
    )
    .eq("assignment_id", assignmentId)
    .eq("learner_id", learnerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return AssignmentSubmissionRowSchema.parse(normalizeSubmissionRow(data));
};

export const upsertSubmission = async (
  client: SupabaseClient,
  input: UpsertSubmissionInput,
): Promise<AssignmentSubmissionRow> => {
  const payload = {
    assignment_id: input.assignmentId,
    learner_id: input.learnerId,
    submission_text: input.submissionText,
    submission_link: input.submissionLink ?? null,
    status: input.status,
    late: input.late,
    submitted_at: input.submittedAt,
    score: null,
    feedback_text: null,
    graded_at: null,
    feedback_updated_at: null,
  };

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .upsert(payload, { onConflict: "assignment_id,learner_id" })
    .select(
      "id, assignment_id, learner_id, submission_text, submission_link, status, late, submitted_at, graded_at, feedback_text, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Failed to load submission result.");
  }

  return AssignmentSubmissionRowSchema.parse(normalizeSubmissionRow(data));
};
