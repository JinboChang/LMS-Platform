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
