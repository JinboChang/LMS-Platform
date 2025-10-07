import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppLogger } from '@/backend/hono/context';
import { fetchInstructorProfileByAuthId, fetchInstructorCourseById } from '@/features/instructor/common/repository';
import type { AssignmentStatus } from '@/features/instructor-assignments/backend/schema';

export const ASSIGNMENT_STATUS_TRANSITIONS = {
  draft: ['published'],
  published: ['closed'],
  closed: [],
} as const satisfies Record<
  AssignmentStatus,
  readonly AssignmentStatus[]
>;

export type PublishValidationCandidate = {
  title: string;
  description: string;
  dueAt: string;
  scoreWeight: number;
  instructions: string;
  submissionRequirements: string;
  lateSubmissionAllowed: boolean;
};

export const validatePublishReadiness = (assignment: PublishValidationCandidate) =>
  [
    assignment.title,
    assignment.description,
    assignment.dueAt,
    assignment.instructions,
    assignment.submissionRequirements,
  ].every((value) => typeof value === 'string' && value.trim().length > 0) &&
  typeof assignment.scoreWeight === 'number' &&
  Number.isFinite(assignment.scoreWeight);

export const validateStatusTransition = (
  currentStatus: AssignmentStatus,
  nextStatus: AssignmentStatus,
) => {
  const allowed = ASSIGNMENT_STATUS_TRANSITIONS[currentStatus] ?? [];
  return allowed.includes(nextStatus);
};

type EnsureInstructorProfileSuccess = {
  ok: true;
  profile: {
    instructorId: string;
    authUserId: string;
  };
};

type EnsureInstructorProfileFailure =
  | {
      ok: false;
      profile: null;
    }
  | {
      ok: false;
      error: unknown;
    };

export const ensureInstructorProfile = async (
  client: SupabaseClient,
  accessToken: string,
): Promise<EnsureInstructorProfileSuccess | EnsureInstructorProfileFailure> => {
  const authUserResult = await client.auth.getUser(accessToken);

  if (authUserResult.error || !authUserResult.data.user) {
    return {
      ok: false,
      error: authUserResult.error,
    };
  }

  const authUserId = authUserResult.data.user.id;

  try {
    const profile = await fetchInstructorProfileByAuthId(client, authUserId);

    if (!profile) {
      return {
        ok: false,
        profile: null,
      };
    }

    return {
      ok: true,
      profile,
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
};

export const ensureCourseOwnership = async (
  client: SupabaseClient,
  instructorId: string,
  courseId: string,
  logger: AppLogger,
) => {
  try {
    return await fetchInstructorCourseById(client, instructorId, courseId);
  } catch (error) {
    logger.error('Failed to verify instructor course ownership.', error);
    return null;
  }
};

