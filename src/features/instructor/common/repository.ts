import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const USERS_TABLE = 'users';

const InstructorProfileRowSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  role: z.literal('instructor'),
});

export type InstructorProfileRow = z.infer<typeof InstructorProfileRowSchema>;

export type InstructorProfile = {
  instructorId: string;
  authUserId: string;
};

const CoursesTableRowSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  title: z.string().min(1),
});

export type InstructorCourseRow = z.infer<typeof CoursesTableRowSchema>;

export const fetchInstructorProfileByAuthId = async (
  client: SupabaseClient,
  authUserId: string,
): Promise<InstructorProfile | null> => {
  const { data, error } = await client
    .from(USERS_TABLE)
    .select('id, auth_user_id, role')
    .eq('auth_user_id', authUserId)
    .eq('role', 'instructor')
    .maybeSingle<InstructorProfileRow>();

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch instructor profile.');
  }

  if (!data) {
    return null;
  }

  const parsed = InstructorProfileRowSchema.safeParse(data);

  if (!parsed.success) {
    throw parsed.error;
  }

  return {
    instructorId: parsed.data.id,
    authUserId: parsed.data.auth_user_id,
  } satisfies InstructorProfile;
};

export const fetchInstructorCourseById = async (
  client: SupabaseClient,
  instructorId: string,
  courseId: string,
): Promise<InstructorCourseRow | null> => {
  const { data, error } = await client
    .from('courses')
    .select('id, instructor_id, title')
    .eq('id', courseId)
    .eq('instructor_id', instructorId)
    .maybeSingle<InstructorCourseRow>();

  if (error) {
    throw new Error(error.message ?? 'Failed to verify course ownership.');
  }

  if (!data) {
    return null;
  }

  const parsed = CoursesTableRowSchema.safeParse(data);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};
