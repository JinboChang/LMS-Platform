import { z } from "zod";
import {
  AssignmentSubmissionResponseSchema as BackendSubmissionResponseSchema,
  submissionStatuses,
  type AssignmentSubmissionResponse as BackendSubmissionResponse,
} from "@/features/assignments/backend/submission-schema";
import {
  assignmentSubmissionErrorCodes,
  type AssignmentSubmissionErrorCode,
} from "@/features/assignments/backend/submission-error";

export const AssignmentSubmissionResponseSchema =
  BackendSubmissionResponseSchema;

export type AssignmentSubmissionResponse = BackendSubmissionResponse;

export const AssignmentSubmissionStatusSchema = z.enum(submissionStatuses);

export type AssignmentSubmissionStatus = z.infer<
  typeof AssignmentSubmissionStatusSchema
>;

export const assignmentSubmissionClientErrorCodes =
  assignmentSubmissionErrorCodes;

export type AssignmentSubmissionClientErrorCode =
  AssignmentSubmissionErrorCode;
