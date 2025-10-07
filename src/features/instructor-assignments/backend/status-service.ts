import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import type { AppLogger } from '@/backend/hono/context';
import {
  AssignmentStatusResponseSchema,
  ChangeAssignmentStatusRequestSchema,
  type AssignmentStatusResponse,
} from '@/features/instructor-assignments/backend/status-schema';
import {
  ensureCourseOwnership,
  ensureInstructorProfile,
  validatePublishReadiness,
  validateStatusTransition,
} from '@/features/instructor-assignments/backend/shared';
import {
  getInstructorAssignment,
  updateInstructorAssignmentStatus,
} from '@/features/instructor-assignments/backend/repository';
import { instructorAssignmentsErrorCodes } from '@/features/instructor-assignments/backend/error';
import type { AssignmentStatus } from '@/features/instructor-assignments/backend/schema';

export type AssignmentStatusServiceDeps = {
  client: SupabaseClient;
  logger: AppLogger;
};

type ChangeStatusContext = AssignmentStatusServiceDeps & {
  courseId: string;
  assignmentId: string;
  accessToken: string | undefined;
  body: unknown;
};

const buildStatusResponse = ({
  status,
  publishedAt,
  closedAt,
  updatedAt,
}: {
  status: AssignmentStatus;
  publishedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}): AssignmentStatusResponse =>
  AssignmentStatusResponseSchema.parse({
    status,
    publishedAt,
    closedAt,
    updatedAt,
  });

const resolveStatusTimestamps = ({
  currentStatus,
  nextStatus,
  publishedAt,
}: {
  currentStatus: AssignmentStatus;
  nextStatus: AssignmentStatus;
  publishedAt: string | null;
}) => {
  const now = new Date().toISOString();

  if (currentStatus === 'draft' && nextStatus === 'published') {
    return {
      publishedAt: publishedAt ?? now,
      closedAt: null,
    } as const;
  }

  if (currentStatus === 'published' && nextStatus === 'closed') {
    return {
      publishedAt,
      closedAt: now,
    } as const;
  }

  return {
    publishedAt,
    closedAt: null,
  } as const;
};

export const changeInstructorAssignmentStatus = async ({
  client,
  logger,
  courseId,
  assignmentId,
  accessToken,
  body,
}: ChangeStatusContext): Promise<
  HandlerResult<AssignmentStatusResponse, string, unknown>
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
      logger.error(
        'Failed to resolve instructor profile for assignment status change.',
        profileResult.error,
      );
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
      lateSubmissionAllowed: existingAssignment.lateSubmissionAllowed,
    })
  ) {
    return failure(
      409,
      instructorAssignmentsErrorCodes.publishRequirementsIncomplete,
      'Please complete required assignment information before publishing.',
    );
  }

  const { publishedAt, closedAt } = resolveStatusTimestamps({
    currentStatus,
    nextStatus,
    publishedAt: existingAssignment.publishedAt,
  });

  try {
    const updated = await updateInstructorAssignmentStatus(
      client,
      courseId,
      assignmentId,
      {
        status: nextStatus,
        publishedAt,
        closedAt,
      },
    );

    return success(
      buildStatusResponse({
        status: updated.assignment.status,
        publishedAt: updated.assignment.publishedAt,
        closedAt: updated.assignment.closedAt,
        updatedAt: updated.assignment.updatedAt,
      }),
    );
  } catch (error) {
    logger.error('Failed to update instructor assignment status.', error);
    return failure(
      500,
      instructorAssignmentsErrorCodes.updateFailed,
      'Failed to update assignment status.',
    );
  }
};

