import {
  AssignmentStatusResponseSchema,
  ChangeAssignmentStatusRequestSchema,
  type AssignmentStatusResponse,
  type ChangeAssignmentStatusRequest,
} from '@/features/instructor-assignments/lib/dto';

export const ASSIGNMENT_STATUS_ENDPOINT_RESPONSE = AssignmentStatusResponseSchema;
export const ASSIGNMENT_STATUS_ENDPOINT_REQUEST = ChangeAssignmentStatusRequestSchema;

export type AssignmentStatusPayload = ChangeAssignmentStatusRequest;
export type AssignmentStatusResult = AssignmentStatusResponse;

export const parseAssignmentStatusResponse = (payload: unknown) =>
  ASSIGNMENT_STATUS_ENDPOINT_RESPONSE.parse(payload);

