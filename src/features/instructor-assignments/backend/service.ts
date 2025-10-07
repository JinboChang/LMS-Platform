import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import type { AppLogger } from '@/backend/hono/context';
import {
  ChangeAssignmentStatusRequestSchema,
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
import { fetchInstructorProfileByAuthId, fetchInstructorCourseById } from '@/features/instructor/common/repository';

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

type StatusContext = ServiceContext & {
  assignmentId: string;
  body: unknown;
};

const ASSIGNMENT_STATUS_TRANSITIONS = {
  draft: ['published'],
  published: ['closed'],
  closed: [],
} as const;

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

type PublishValidationCandidate = {
  title: string;
  description: string;
  dueAt: string;
  scoreWeight: number;
  instructions: string;
  submissionRequirements: string;
};

const ensureInstructorProfile = async (
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

  const authUserId = authUserResult.data.user.id;

  try {
    const profile = await fetchInstructorProfileByAuthId(client, authUserId);

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

const validatePublishReadiness = (assignment: PublishValidationCandidate) =>
  [
    assignment.title,
    assignment.description,
    assignment.dueAt,
    assignment.instructions,
    assignment.submissionRequirements,
  ].every((value) => typeof value === 'string' && value.trim().length > 0) &&
  typeof assignment.scoreWeight === 'number';

const validateStatusTransition = (
  currentStatus: keyof typeof ASSIGNMENT_STATUS_TRANSITIONS,
  nextStatus: keyof typeof ASSIGNMENT_STATUS_TRANSITIONS,
) => {
  const allowed = ASSIGNMENT_STATUS_TRANSITIONS[currentStatus] ?? [];
  return (allowed as readonly (keyof typeof ASSIGNMENT_STATUS_TRANSITIONS)[]).includes(
    nextStatus,
  );
};

const ensureCourseOwnership = async (
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

export const changeInstructorAssignmentStatus = async ({
  client,
  logger,
  courseId,
  assignmentId,
  accessToken,
  body,
}: StatusContext): Promise<
  HandlerResult<AssignmentResponse, string, unknown>
> => {
  if (!accessToken) {
    return failure(
      401,
      instructorAssignmentsErrorCodes.unauthorized,
      'Login is required to manage assignments.',
    );
  }

  const parsedBody = ChangeAssignmentStatusRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return failure(
      422,
      instructorAssignmentsErrorCodes.validationFailed,
      'Assignment status payload validation failed.',
      parsedBody.error.format(),
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if ('error' in profileResult && profileResult.error) {
      logger.error('Failed to resolve instructor profile for assignment status change.', profileResult.error);
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

  const nextStatus = parsedBody.data.nextStatus;
  const currentStatus = existingAssignment.status;

  if (!validateStatusTransition(currentStatus, nextStatus)) {
    return failure(
      409,
      instructorAssignmentsErrorCodes.statusTransitionInvalid,
      'Invalid assignment status transition.',
    );
  }

  if (
    currentStatus === 'draft' &&
    nextStatus === 'published' &&
    !validatePublishReadiness({
      title: existingAssignment.title,
      description: existingAssignment.description,
      dueAt: existingAssignment.dueAt,
      scoreWeight: existingAssignment.scoreWeight,
      instructions: existingAssignment.instructions,
      submissionRequirements: existingAssignment.submissionRequirements,
    })
  ) {
    return failure(
      409,
      instructorAssignmentsErrorCodes.statusTransitionInvalid,
      'Please complete required assignment information before publishing.',
    );
  }

  try {
    const response = await updateAssignmentRecord(
      client,
      courseId,
      assignmentId,
      { status: nextStatus },
    );

    return success(response);
  } catch (error) {
    logger.error('Failed to update instructor assignment status.', error);
    return failure(
      500,
      instructorAssignmentsErrorCodes.updateFailed,
      'Failed to update assignment status.',
    );
  }
};
