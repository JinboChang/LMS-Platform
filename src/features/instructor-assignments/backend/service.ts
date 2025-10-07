import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import type { AppLogger } from '@/backend/hono/context';
import {
  CreateAssignmentRequestSchema,
  UpdateAssignmentRequestSchema,
  type AssignmentListResponse,
  type AssignmentResponse,
} from '@/features/instructor-assignments/backend/schema';
import {
  createInstructorAssignment as createAssignmentRecord,
  findInstructorAssignmentByTitle,
  getCourseAssignmentScoreWeightTotal,
  getInstructorAssignment,
  listInstructorAssignments,
  updateInstructorAssignment as updateAssignmentRecord,
} from '@/features/instructor-assignments/backend/repository';
import { instructorAssignmentsErrorCodes } from '@/features/instructor-assignments/backend/error';
import {
  ensureCourseOwnership,
  ensureInstructorProfile,
} from '@/features/instructor-assignments/backend/shared';

export type InstructorAssignmentsServiceDeps = {
  client: SupabaseClient;
  logger: AppLogger;
};

type ServiceContext = InstructorAssignmentsServiceDeps & {
  courseId: string;
  accessToken: string | undefined;
};

type CreateContext = ServiceContext & {
  body: unknown;
};

type UpdateContext = ServiceContext & {
  assignmentId: string;
  body: unknown;
};

const SCORE_WEIGHT_LIMIT = 100;
const SCORE_WEIGHT_EPSILON = 0.0001;

const addScoreWeights = (...weights: number[]) =>
  Math.round(weights.reduce((acc, weight) => acc + weight, 0) * 100) / 100;

const exceedsScoreWeightLimit = (value: number) =>
  value - SCORE_WEIGHT_LIMIT > SCORE_WEIGHT_EPSILON;

const isPostgrestError = (error: unknown): error is PostgrestError =>
  Boolean(error) &&
  typeof error === 'object' &&
  error !== null &&
  'code' in (error as Record<string, unknown>);

const isUniqueConstraintViolation = (error: PostgrestError) =>
  error.code === '23505';

export const getInstructorAssignments = async ({
  client,
  logger,
  courseId,
  accessToken,
}: ServiceContext): Promise<
  HandlerResult<AssignmentListResponse, string, unknown>
> => {
  if (!accessToken) {
    return failure(
      401,
      instructorAssignmentsErrorCodes.unauthorized,
      'Login is required to manage assignments.',
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if ('error' in profileResult && profileResult.error) {
      logger.error('Failed to resolve instructor profile.', profileResult.error);
      return failure(
        500,
        instructorAssignmentsErrorCodes.profileLookupFailed,
        'Failed to load instructor profile.',
      );
    }

    return failure(
      403,
      instructorAssignmentsErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  const course = await ensureCourseOwnership(
    client,
    profileResult.profile.instructorId,
    courseId,
    logger,
  );

  if (!course) {
    return failure(
      404,
      instructorAssignmentsErrorCodes.courseNotFound,
      'Course is not registered or access is denied.',
    );
  }

  try {
    const response = await listInstructorAssignments(client, courseId);
    return success(response);
  } catch (error) {
    logger.error('Failed to fetch instructor assignments.', error);
    return failure(
      500,
      instructorAssignmentsErrorCodes.assignmentFetchFailed,
      'Failed to load assignments.',
    );
  }
};

export const createInstructorAssignment = async ({
  client,
  logger,
  courseId,
  accessToken,
  body,
}: CreateContext): Promise<
  HandlerResult<AssignmentResponse, string, unknown>
> => {
  if (!accessToken) {
    return failure(
      401,
      instructorAssignmentsErrorCodes.unauthorized,
      'Login is required to manage assignments.',
    );
  }

  const parsedBody = CreateAssignmentRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return failure(
      422,
      instructorAssignmentsErrorCodes.validationFailed,
      'Assignment payload validation failed.',
      parsedBody.error.format(),
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if ('error' in profileResult && profileResult.error) {
      logger.error('Failed to resolve instructor profile for assignment creation.', profileResult.error);
      return failure(
        500,
        instructorAssignmentsErrorCodes.profileLookupFailed,
        'Failed to verify instructor profile.',
      );
    }

    return failure(
      403,
      instructorAssignmentsErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  const course = await ensureCourseOwnership(
    client,
    profileResult.profile.instructorId,
    courseId,
    logger,
  );

  if (!course) {
    return failure(
      404,
      instructorAssignmentsErrorCodes.courseNotFound,
      'Course is not registered or access is denied.',
    );
  }

  try {
    const duplicateAssignment = await findInstructorAssignmentByTitle(
      client,
      courseId,
      parsedBody.data.title,
    );

    if (duplicateAssignment) {
      return failure(
        409,
        instructorAssignmentsErrorCodes.duplicateAssignment,
        'An assignment with the same title already exists.',
      );
    }

    const currentWeightTotal = await getCourseAssignmentScoreWeightTotal(
      client,
      courseId,
    );
    const nextWeightTotal = addScoreWeights(
      currentWeightTotal,
      parsedBody.data.scoreWeight,
    );

    if (exceedsScoreWeightLimit(nextWeightTotal)) {
      return failure(
        422,
        instructorAssignmentsErrorCodes.scoreWeightExceeded,
        'Total assignment weight cannot exceed 100%.',
        {
          currentTotal: currentWeightTotal,
          attemptedTotal: nextWeightTotal,
          limit: SCORE_WEIGHT_LIMIT,
        },
      );
    }

    const response = await createAssignmentRecord(
      client,
      courseId,
      parsedBody.data,
    );

    return success(response, 201);
  } catch (error) {
    if (isPostgrestError(error) && isUniqueConstraintViolation(error)) {
      return failure(
        409,
        instructorAssignmentsErrorCodes.duplicateAssignment,
        'An assignment with the same title already exists.',
      );
    }

    logger.error('Failed to create instructor assignment.', error);
    return failure(
      500,
      instructorAssignmentsErrorCodes.createFailed,
      'Failed to create assignment.',
    );
  }
};

export const updateInstructorAssignment = async ({
  client,
  logger,
  courseId,
  assignmentId,
  accessToken,
  body,
}: UpdateContext): Promise<
  HandlerResult<AssignmentResponse, string, unknown>
> => {
  if (!accessToken) {
    return failure(
      401,
      instructorAssignmentsErrorCodes.unauthorized,
      'Login is required to manage assignments.',
    );
  }

  const parsedBody = UpdateAssignmentRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return failure(
      422,
      instructorAssignmentsErrorCodes.validationFailed,
      'Assignment update payload validation failed.',
      parsedBody.error.format(),
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if ('error' in profileResult && profileResult.error) {
      logger.error('Failed to resolve instructor profile for assignment update.', profileResult.error);
      return failure(
        500,
        instructorAssignmentsErrorCodes.profileLookupFailed,
        'Failed to verify instructor profile.',
      );
    }

    return failure(
      403,
      instructorAssignmentsErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  const course = await ensureCourseOwnership(
    client,
    profileResult.profile.instructorId,
    courseId,
    logger,
  );

  if (!course) {
    return failure(
      404,
      instructorAssignmentsErrorCodes.courseNotFound,
      'Course is not registered or access is denied.',
    );
  }

  const existingAssignment = await getInstructorAssignment(
    client,
    courseId,
    assignmentId,
  );

  if (!existingAssignment) {
    return failure(
      404,
      instructorAssignmentsErrorCodes.assignmentNotFound,
      'Assignment is not registered.',
    );
  }

  try {
    if (
      parsedBody.data.title &&
      parsedBody.data.title !== existingAssignment.title
    ) {
      const duplicateAssignment = await findInstructorAssignmentByTitle(
        client,
        courseId,
        parsedBody.data.title,
        { excludeAssignmentId: assignmentId },
      );

      if (duplicateAssignment) {
        return failure(
          409,
          instructorAssignmentsErrorCodes.duplicateAssignment,
          'An assignment with the same title already exists.',
        );
      }
    }

    if (parsedBody.data.scoreWeight !== undefined) {
      const remainingWeightTotal = await getCourseAssignmentScoreWeightTotal(
        client,
        courseId,
        { excludeAssignmentId: assignmentId },
      );
      const nextWeightTotal = addScoreWeights(
        remainingWeightTotal,
        parsedBody.data.scoreWeight,
      );

      if (exceedsScoreWeightLimit(nextWeightTotal)) {
        return failure(
          422,
          instructorAssignmentsErrorCodes.scoreWeightExceeded,
          'Total assignment weight cannot exceed 100%.',
          {
            currentTotal: remainingWeightTotal,
            attemptedTotal: nextWeightTotal,
            limit: SCORE_WEIGHT_LIMIT,
          },
        );
      }
    }

    const response = await updateAssignmentRecord(
      client,
      courseId,
      assignmentId,
      parsedBody.data,
    );

    return success(response);
  } catch (error) {
    if (isPostgrestError(error) && isUniqueConstraintViolation(error)) {
      return failure(
        409,
        instructorAssignmentsErrorCodes.duplicateAssignment,
        'An assignment with the same title already exists.',
      );
    }

    logger.error('Failed to update instructor assignment.', error);
    return failure(
      500,
      instructorAssignmentsErrorCodes.updateFailed,
      'Failed to update assignment.',
    );
  }
};
