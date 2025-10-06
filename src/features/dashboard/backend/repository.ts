import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  AssignmentRowSchema,
  EnrollmentRowSchema,
  LearnerProfileRowSchema,
  SubmissionRowSchema,
  type AssignmentRow,
  type SubmissionRow,
} from '@/features/dashboard/backend/schema';

const USERS_TABLE = 'users';
const ENROLLMENTS_TABLE = 'enrollments';
const ASSIGNMENTS_TABLE = 'assignments';
const SUBMISSIONS_TABLE = 'assignment_submissions';

const EnrollmentRowsSchema = z.array(EnrollmentRowSchema);
const AssignmentRowsSchema = z.array(AssignmentRowSchema);
const SubmissionRowsSchema = z.array(SubmissionRowSchema);

const LearnerProfileSchema = LearnerProfileRowSchema.extend({});

type Client = SupabaseClient;

type EnrollmentRowWithCourse = z.infer<typeof EnrollmentRowSchema> & {
  courses: NonNullable<z.infer<typeof EnrollmentRowSchema>['courses']>;
};

type FetchedEnrollment = {
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
};

type FetchAssignmentsArgs = {
  client: Client;
  courseIds: readonly string[];
};

type FetchSubmissionsArgs = {
  client: Client;
  assignmentIds: readonly string[];
  learnerId: string;
};

type LearnerProfile = {
  learnerId: string;
  authUserId: string;
};

const hasCourse = (
  row: z.infer<typeof EnrollmentRowSchema>,
): row is EnrollmentRowWithCourse => Boolean(row.courses);

export const fetchLearnerProfileByAuthId = async (
  client: Client,
  authUserId: string,
): Promise<LearnerProfile | null> => {
  const { data, error } = await client
    .from(USERS_TABLE)
    .select('id, auth_user_id, role')
    .eq('auth_user_id', authUserId)
    .eq('role', 'learner')
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch learner profile.');
  }

  if (!data) {
    return null;
  }

  const parsed = LearnerProfileSchema.safeParse(data);

  if (!parsed.success) {
    throw parsed.error;
  }

  return {
    learnerId: parsed.data.id,
    authUserId: parsed.data.auth_user_id,
  };
};

export const fetchActiveEnrollments = async (
  client: Client,
  learnerId: string,
): Promise<FetchedEnrollment[]> => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select(
      `course_id, created_at, courses!inner ( id, title, status )`,
    )
    .eq('learner_id', learnerId)
    .eq('status', 'active')
    .eq('courses.status', 'published');

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch active enrollments.');
  }

  const parsed = EnrollmentRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data.filter(hasCourse).map((row) => ({
    courseId: row.courses.id,
    courseTitle: row.courses.title,
    enrolledAt: row.created_at,
  }));
};

export const fetchPublishedAssignments = async ({
  client,
  courseIds,
}: FetchAssignmentsArgs): Promise<AssignmentRow[]> => {
  if (courseIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .select(
      'id, course_id, title, due_at, status, late_submission_allowed, created_at, updated_at',
    )
    .in('course_id', [...courseIds])
    .eq('status', 'published');

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch assignments.');
  }

  const parsed = AssignmentRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

export const fetchLearnerSubmissions = async ({
  client,
  assignmentIds,
  learnerId,
}: FetchSubmissionsArgs): Promise<SubmissionRow[]> => {
  if (assignmentIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select(
      'id, assignment_id, learner_id, status, score, feedback_text, submitted_at, graded_at, feedback_updated_at, late, created_at, updated_at',
    )
    .in('assignment_id', [...assignmentIds])
    .eq('learner_id', learnerId);

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch submissions.');
  }

  const parsed = SubmissionRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

export type { FetchedEnrollment, LearnerProfile };