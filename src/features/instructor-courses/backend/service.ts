import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import type { AppLogger } from '@/backend/hono/context';
import type {
  CourseListResponse,
  CourseResponse,
  CourseListItem,
} from '@/features/instructor-courses/backend/schema';
import {
  CreateCourseRequestSchema,
  UpdateCourseRequestSchema,
  ChangeCourseStatusRequestSchema,
} from '@/features/instructor-courses/backend/schema';
import { instructorCoursesErrorCodes } from '@/features/instructor-courses/backend/error';
import {
  createCourse,
  getCourseById,
  listCoursesByInstructor,
  updateCourse,
} from '@/features/instructor-courses/backend/repository';
import { COURSE_STATUS_TRANSITIONS } from '@/features/instructor-courses/constants';
import { fetchInstructorProfileByAuthId } from '@/features/instructor/common/repository';

export type InstructorCoursesServiceDeps = {
  client: SupabaseClient;
  logger: AppLogger;
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
        error: null,
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

const verifyOwnership = async (
  client: SupabaseClient,
  instructorId: string,
  courseId: string,
) => getCourseById(client, instructorId, courseId);

const validateStatusTransition = (
  currentStatus: keyof typeof COURSE_STATUS_TRANSITIONS,
  nextStatus: keyof typeof COURSE_STATUS_TRANSITIONS,
) => COURSE_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);

const hasRequiredPublishFields = (course: Pick<
  CourseListItem,
  'title' | 'description' | 'curriculum' | 'categoryId' | 'difficultyId'
>) =>
  [course.title, course.description, course.curriculum, course.categoryId, course.difficultyId].every(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );

export const getInstructorCourses = async ({
  client,
  logger,
  accessToken,
}: InstructorCoursesServiceDeps & {
  accessToken: string | undefined;
}): Promise<HandlerResult<CourseListResponse, string, unknown>> => {
  if (!accessToken) {
    return failure(
      401,
      instructorCoursesErrorCodes.unauthorized,
      'Login is required to access instructor courses.',
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if (profileResult.error) {
      logger.error('Failed to resolve instructor profile.', profileResult.error);
      return failure(
        500,
        instructorCoursesErrorCodes.profileLookupFailed,
        'Failed to load instructor profile.',
      );
    }

    return failure(
      403,
      instructorCoursesErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  try {
    const response = await listCoursesByInstructor(
      client,
      profileResult.profile.instructorId,
    );

    return success(response);
  } catch (error) {
    logger.error('Failed to fetch instructor courses.', error);
    return failure(
      500,
      instructorCoursesErrorCodes.fetchFailed,
      'Failed to load instructor courses.',
    );
  }
};

export const createInstructorCourse = async ({
  client,
  logger,
  accessToken,
  body,
}: InstructorCoursesServiceDeps & {
  accessToken: string | undefined;
  body: unknown;
}): Promise<HandlerResult<CourseResponse, string, unknown>> => {
  if (!accessToken) {
    return failure(
      401,
      instructorCoursesErrorCodes.unauthorized,
      'Login is required to create a course.',
    );
  }

  const parsedBody = CreateCourseRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return failure(
      422,
      instructorCoursesErrorCodes.validationFailed,
      'Course payload validation failed.',
      parsedBody.error.format(),
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if (profileResult.error) {
      logger.error('Failed to resolve instructor profile for course creation.', profileResult.error);
      return failure(
        500,
        instructorCoursesErrorCodes.profileLookupFailed,
        'Failed to verify instructor profile.',
      );
    }

    return failure(
      403,
      instructorCoursesErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  try {
    const course = await createCourse(
      client,
      profileResult.profile.instructorId,
      parsedBody.data,
    );

    return success({ course }, 201);
  } catch (error) {
    logger.error('Failed to create instructor course.', error);
    return failure(
      500,
      instructorCoursesErrorCodes.createFailed,
      'Failed to create course.',
    );
  }
};

export const updateInstructorCourse = async ({
  client,
  logger,
  accessToken,
  courseId,
  body,
}: InstructorCoursesServiceDeps & {
  accessToken: string | undefined;
  courseId: string;
  body: unknown;
}): Promise<HandlerResult<CourseResponse, string, unknown>> => {
  if (!accessToken) {
    return failure(
      401,
      instructorCoursesErrorCodes.unauthorized,
      'Login is required to update a course.',
    );
  }

  const parsedBody = UpdateCourseRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return failure(
      422,
      instructorCoursesErrorCodes.validationFailed,
      'Course update validation failed.',
      parsedBody.error.format(),
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if (profileResult.error) {
      logger.error('Failed to resolve instructor profile for course update.', profileResult.error);
      return failure(
        500,
        instructorCoursesErrorCodes.profileLookupFailed,
        'Failed to verify instructor profile.',
      );
    }

    return failure(
      403,
      instructorCoursesErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  const existingCourse = await verifyOwnership(
    client,
    profileResult.profile.instructorId,
    courseId,
  );

  if (!existingCourse) {
    return failure(
      403,
      instructorCoursesErrorCodes.forbidden,
      'You are not allowed to modify this course.',
    );
  }

  try {
    const course = await updateCourse(
      client,
      profileResult.profile.instructorId,
      courseId,
      parsedBody.data,
    );

    return success({ course });
  } catch (error) {
    logger.error('Failed to update instructor course.', error);
    return failure(
      500,
      instructorCoursesErrorCodes.updateFailed,
      'Failed to update course.',
    );
  }
};

export const changeInstructorCourseStatus = async ({
  client,
  logger,
  accessToken,
  courseId,
  body,
}: InstructorCoursesServiceDeps & {
  accessToken: string | undefined;
  courseId: string;
  body: unknown;
}): Promise<HandlerResult<CourseResponse, string, unknown>> => {
  if (!accessToken) {
    return failure(
      401,
      instructorCoursesErrorCodes.unauthorized,
      'Login is required to update course status.',
    );
  }

  const parsedBody = ChangeCourseStatusRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return failure(
      422,
      instructorCoursesErrorCodes.validationFailed,
      'Course status payload validation failed.',
      parsedBody.error.format(),
    );
  }

  const profileResult = await ensureInstructorProfile(client, accessToken);

  if (!profileResult.ok) {
    if (profileResult.error) {
      logger.error('Failed to resolve instructor profile for status change.', profileResult.error);
      return failure(
        500,
        instructorCoursesErrorCodes.profileLookupFailed,
        'Failed to verify instructor profile.',
      );
    }

    return failure(
      403,
      instructorCoursesErrorCodes.profileNotFound,
      'Instructor profile is not registered.',
    );
  }

  const existingCourse = await verifyOwnership(
    client,
    profileResult.profile.instructorId,
    courseId,
  );

  if (!existingCourse) {
    return failure(
      403,
      instructorCoursesErrorCodes.forbidden,
      'You are not allowed to modify this course.',
    );
  }

  const nextStatus = parsedBody.data.nextStatus;
  const currentStatus = existingCourse.status;

  if (!validateStatusTransition(currentStatus, nextStatus)) {
    return failure(
      409,
      instructorCoursesErrorCodes.statusTransitionInvalid,
      'Invalid status transition.',
    );
  }

  if (
    currentStatus === 'draft' &&
    nextStatus === 'published' &&
    !hasRequiredPublishFields(existingCourse)
  ) {
    return failure(
      409,
      instructorCoursesErrorCodes.statusTransitionInvalid,
      'Required course information is missing before publishing.',
    );
  }

  try {
    const course = await updateCourse(
      client,
      profileResult.profile.instructorId,
      courseId,
      { status: nextStatus },
    );

    return success({ course });
  } catch (error) {
    logger.error('Failed to change instructor course status.', error);
    return failure(
      500,
      instructorCoursesErrorCodes.updateFailed,
      'Failed to update course status.',
    );
  }
};
