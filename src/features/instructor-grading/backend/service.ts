import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import type { AppLogger } from '@/backend/hono/context';
import {
  getSubmissionDetailForInstructor,
  updateSubmissionGrade,
} from '@/features/instructor-grading/backend/repository';
import {
  GradeSubmissionRequestSchema,
  type GradeSubmissionRequest,
  type GradeSubmissionResponse,
  type SubmissionDetailResponse,
} from '@/features/instructor-grading/backend/schema';
import { instructorGradingErrorCodes } from '@/features/instructor-grading/backend/error';
import { fetchInstructorProfileByAuthId } from '@/features/instructor/common/repository';

export type InstructorGradingServiceDeps = {
  client: SupabaseClient;
  logger: AppLogger;
};

type SubmissionContext = InstructorGradingServiceDeps & {
  assignmentId: string;
  submissionId: string;
  accessToken: string | undefined;
};

type GradeContext = SubmissionContext & {
  body: unknown;
};

const GRADEABLE_STATUSES = new Set(['submitted', 'resubmission_required'] as const);

const resolveInstructorProfile = async (
  client: SupabaseClient,
  accessToken: string,
) => {
  const authUserResult = await client.auth.getUser(accessToken);

  if (authUserResult.error || !authUserResult.data.user) {
    return {
      ok: false as const,
      error: authUserResult.error,
    };
  }

  try {
    const profile = await fetchInstructorProfileByAuthId(
      client,
      authUserResult.data.user.id,
    );

    if (!profile) {
      return {
        ok: false as const,
        profile: null,
      };
    }

    return {
      ok: true as const,
      profile,
    };
  } catch (error) {
    return {
      ok: false as const,
      error,
    };
  }
};

const requireAccessToken = (accessToken: string | undefined) => {
  if (!accessToken) {
    return failure(
      401,
      instructorGradingErrorCodes.unauthorized,
      'Login is required to manage grading.',
    );
  }

  return null;
};

const normalizeFeedbackText = (feedbackText: GradeSubmissionRequest['feedbackText']) => {
  if (!feedbackText) {
    return null;
  }

  const trimmed = feedbackText.trim();

  return trimmed.length > 0 ? trimmed : null;
};

export const getInstructorSubmissionDetail = async ({
  client,
  logger,
  assignmentId,
  submissionId,
  accessToken,
}: SubmissionContext): Promise<
  HandlerResult<SubmissionDetailResponse, string, unknown>
> => {
  const accessTokenError = requireAccessToken(accessToken);

  if (accessTokenError) {
    return accessTokenError;
  }

  const profileResult = await resolveInstructorProfile(client, accessToken!);

  if (!profileResult.ok) {
    if ('error' in profileResult && profileResult.error) {
      logger.error('Failed to resolve instructor profile for submission detail.', profileResult.error);
      return failure(
        500,
        instructorGradingErrorCodes.profileLookupFailed,
        'Failed to verify instructor profile.',
      );
    }

    return failure(
      403,
      instructorGradingErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  try {
    const submission = await getSubmissionDetailForInstructor(
      client,
      assignmentId,
      submissionId,
      profileResult.profile.instructorId,
    );

    if (!submission) {
      return failure(
        404,
        instructorGradingErrorCodes.submissionNotFound,
        'Submission is not registered or access is denied.',
      );
    }

    return success({ submission });
  } catch (error) {
    logger.error('Failed to load submission detail for grading.', error);
    return failure(
      500,
      instructorGradingErrorCodes.fetchFailed,
      'Failed to load submission detail.',
    );
  }
};

export const gradeInstructorSubmission = async ({
  client,
  logger,
  assignmentId,
  submissionId,
  accessToken,
  body,
}: GradeContext): Promise<
  HandlerResult<GradeSubmissionResponse, string, unknown>
> => {
  const accessTokenError = requireAccessToken(accessToken);

  if (accessTokenError) {
    return accessTokenError;
  }

  const parsedRequest = GradeSubmissionRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return failure(
      422,
      instructorGradingErrorCodes.validationFailed,
      'Invalid grading payload.',
      parsedRequest.error.format(),
    );
  }

  const profileResult = await resolveInstructorProfile(client, accessToken!);

  if (!profileResult.ok) {
    if ('error' in profileResult && profileResult.error) {
      logger.error('Failed to resolve instructor profile for grading.', profileResult.error);
      return failure(
        500,
        instructorGradingErrorCodes.profileLookupFailed,
        'Failed to verify instructor profile.',
      );
    }

    return failure(
      403,
      instructorGradingErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  let submission;

  try {
    submission = await getSubmissionDetailForInstructor(
      client,
      assignmentId,
      submissionId,
      profileResult.profile.instructorId,
    );
  } catch (error) {
    logger.error('Failed to fetch submission before grading.', error);
    return failure(
      500,
      instructorGradingErrorCodes.fetchFailed,
      'Failed to load submission detail.',
    );
  }

  if (!submission) {
    return failure(
      404,
      instructorGradingErrorCodes.submissionNotFound,
      'Submission is not registered or access is denied.',
    );
  }

  if (!GRADEABLE_STATUSES.has(submission.status)) {
    return failure(
      409,
      instructorGradingErrorCodes.alreadyGraded,
      'Submission is not in a gradable state.',
    );
  }

  const normalizedFeedback = normalizeFeedbackText(parsedRequest.data.feedbackText);
  const nextStatus = parsedRequest.data.requireResubmission ? 'resubmission_required' : 'graded';
  const now = new Date().toISOString();
  const feedbackUpdatedAt = normalizedFeedback ? now : null;

  try {
    const updatedSubmission = await updateSubmissionGrade(client, submissionId, {
      status: nextStatus,
      score: parsedRequest.data.score,
      gradedAt: now,
      feedbackText: normalizedFeedback,
      feedbackUpdatedAt,
    });

    return success({ submission: updatedSubmission }, 200);
  } catch (error) {
    logger.error('Failed to grade submission.', error);
    return failure(
      500,
      instructorGradingErrorCodes.updateFailed,
      'Failed to update submission grade.',
    );
  }
};
