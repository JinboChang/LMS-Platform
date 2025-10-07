import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  INSTRUCTOR_DASHBOARD_PENDING_STATUSES,
} from '@/features/instructor-dashboard/constants';
import {
  AssignmentRowSchema,
  CourseRowSchema,
  SubmissionWithRelationsSchema,
  type AssignmentRow,
  type CourseRow,
  type SubmissionWithRelations,
} from '@/features/instructor-dashboard/backend/schema';
const COURSES_TABLE = 'courses';
const ASSIGNMENTS_TABLE = 'assignments';
const SUBMISSIONS_TABLE = 'assignment_submissions';

const CourseRowsSchema = z.array(CourseRowSchema);
const AssignmentRowsSchema = z.array(AssignmentRowSchema);
const SubmissionWithRelationsRowsSchema = z.array(SubmissionWithRelationsSchema);

const SUBMISSION_SELECT_FIELDS = `
  id,
  assignment_id,
  learner_id,
  status,
  late,
  score,
  feedback_text,
  submitted_at,
  graded_at,
  feedback_updated_at,
  created_at,
  updated_at,
  assignments!inner (
    id,
    title,
    due_at,
    course_id,
    courses!inner (
      id,
      title,
      instructor_id
    )
  ),
  learner:users!assignment_submissions_learner_id_fkey (
    id,
    name
  )
`;

type Supabase = SupabaseClient;

type InstructorProfile = {
  instructorId: string;
  authUserId: string;
};

type FetchAssignmentsArgs = {
  client: Supabase;
  courseIds: readonly string[];
};

type FetchSubmissionsArgs = {
  client: Supabase;
  instructorId: string;
  limit: number;
  statuses?: readonly SubmissionWithRelations['status'][];
  submittedSince?: string | null;
  sortDirection?: 'asc' | 'desc';
};

export const fetchInstructorCourses = async (
  client: Supabase,
  instructorId: string,
): Promise<CourseRow[]> => {
  const { data, error } = await client
    .from(COURSES_TABLE)
    .select('id, title, status, created_at, updated_at')
    .eq('instructor_id', instructorId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch instructor courses.');
  }

  const parsed = CourseRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

export const fetchAssignmentsForCourses = async ({
  client,
  courseIds,
}: FetchAssignmentsArgs): Promise<AssignmentRow[]> => {
  if (courseIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .select('id, course_id, title, status, due_at, created_at, updated_at')
    .in('course_id', [...courseIds]);

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch assignments for courses.');
  }

  const parsed = AssignmentRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

export const fetchSubmissionsForInstructor = async ({
  client,
  instructorId,
  limit,
  statuses,
  submittedSince,
  sortDirection = 'desc',
}: FetchSubmissionsArgs): Promise<SubmissionWithRelations[]> => {
  if (limit <= 0) {
    return [];
  }

  let query = client
    .from(SUBMISSIONS_TABLE)
    .select(SUBMISSION_SELECT_FIELDS)
    .eq('assignments.courses.instructor_id', instructorId)
    .order('submitted_at', { ascending: sortDirection === 'asc' })
    .limit(limit);

  if (statuses && statuses.length > 0) {
    query = query.in('status', [...statuses]);
  }

  if (submittedSince) {
    query = query.gte('submitted_at', submittedSince);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch submissions.');
  }

  const parsed = SubmissionWithRelationsRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

export const fetchPendingSubmissionsForInstructor = async (
  client: Supabase,
  instructorId: string,
  limit: number,
): Promise<SubmissionWithRelations[]> =>
  fetchSubmissionsForInstructor({
    client,
    instructorId,
    limit,
    statuses: INSTRUCTOR_DASHBOARD_PENDING_STATUSES,
    sortDirection: 'asc',
  });
