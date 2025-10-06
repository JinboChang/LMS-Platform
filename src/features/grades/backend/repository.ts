import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  AssignmentRowSchema,
  CourseGradesParamsSchema,
  EnrollmentRowSchema,
  LearnerProfileRowSchema,
  SubmissionRowSchema,
  type AssignmentRow,
  type CourseGradesParams,
  type EnrollmentRow,
  type LearnerProfileRow,
  type SubmissionRow,
} from "@/features/grades/backend/schema";

const USERS_TABLE = "users";
const ENROLLMENTS_TABLE = "enrollments";
const ASSIGNMENTS_TABLE = "assignments";
const SUBMISSIONS_TABLE = "assignment_submissions";

const EnrollmentRowsSchema = z.array(EnrollmentRowSchema);
const AssignmentRowsSchema = z.array(AssignmentRowSchema);
const SubmissionRowsSchema = z.array(SubmissionRowSchema);

export type EnrollmentRecord = {
  courseId: string;
  courseTitle: string;
};

export type AssignmentRecord = AssignmentRow;
export type SubmissionRecord = SubmissionRow;
export type LearnerProfile = LearnerProfileRow;

const hasCourse = (
  row: EnrollmentRow,
): row is EnrollmentRow & { courses: NonNullable<EnrollmentRow["courses"]> } =>
  Boolean(row.courses);

export const fetchLearnerProfileByAuthUserId = async (
  client: SupabaseClient,
  authUserId: string,
): Promise<LearnerProfile | null> => {
  const { data, error } = await client
    .from(USERS_TABLE)
    .select("id, auth_user_id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = LearnerProfileRowSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
};

export const fetchActiveLearnerEnrollments = async (
  client: SupabaseClient,
  learnerId: string,
): Promise<EnrollmentRecord[]> => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select(`course_id, learner_id, status, courses!inner ( id, title )`)
    .eq("learner_id", learnerId)
    .eq("status", "active")
    .eq("courses.status", "published");

  if (error) {
    throw new Error(error.message ?? "Failed to fetch active enrollments.");
  }

  const parsed = EnrollmentRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data.filter(hasCourse).map((row) => ({
    courseId: row.courses.id,
    courseTitle: row.courses.title,
  }));
};

export const fetchAssignmentsForCourses = async (
  client: SupabaseClient,
  courseIds: readonly string[],
): Promise<AssignmentRecord[]> => {
  if (courseIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .select(
      "id, course_id, title, due_at, status, score_weight, late_submission_allowed, created_at, updated_at",
    )
    .in("course_id", [...courseIds])
    .in("status", ["published", "closed"]);

  if (error) {
    throw new Error(error.message ?? "Failed to fetch assignments.");
  }

  const parsed = AssignmentRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

export const fetchLearnerSubmissionsForAssignments = async (
  client: SupabaseClient,
  assignmentIds: readonly string[],
  learnerId: string,
): Promise<SubmissionRecord[]> => {
  if (assignmentIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select(
      "id, assignment_id, learner_id, status, score, feedback_text, submitted_at, graded_at, feedback_updated_at, late, created_at, updated_at",
    )
    .in("assignment_id", [...assignmentIds])
    .eq("learner_id", learnerId);

  if (error) {
    throw new Error(error.message ?? "Failed to fetch submissions.");
  }

  const parsed = SubmissionRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

export const parseCourseParams = (params: unknown) =>
  CourseGradesParamsSchema.safeParse(params);
