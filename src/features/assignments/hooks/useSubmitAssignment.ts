"use client";

import { useMutation } from "@tanstack/react-query";
import {
  apiClient,
  extractApiErrorMessage,
  isAxiosError,
} from "@/lib/remote/api-client";
import {
  AssignmentSubmissionResponseSchema,
  type AssignmentSubmissionResponse,
  type AssignmentSubmissionClientErrorCode,
} from "@/features/assignments/lib/submission-dto";

export class AssignmentSubmissionClientError extends Error {
  code?: AssignmentSubmissionClientErrorCode;

  constructor(message: string, code?: AssignmentSubmissionClientErrorCode) {
    super(message);
    this.name = "AssignmentSubmissionClientError";
    this.code = code;
  }
}

export type SubmitAssignmentVariables = {
  assignmentId: string;
  authUserId: string;
  submissionText: string;
  submissionLink?: string;
};

const postAssignmentSubmission = async (
  variables: SubmitAssignmentVariables,
): Promise<AssignmentSubmissionResponse> => {
  const payload: Record<string, string> = {
    authUserId: variables.authUserId,
    submissionText: variables.submissionText,
  };

  if (variables.submissionLink) {
    payload.submissionLink = variables.submissionLink;
  }

  try {
    const { data } = await apiClient.post(
      `/api/assignments/${variables.assignmentId}/submissions`,
      payload,
    );

    return AssignmentSubmissionResponseSchema.parse(data);
  } catch (error) {
    if (isAxiosError(error)) {
      const code = error.response?.data?.error?.code as
        | AssignmentSubmissionClientErrorCode
        | undefined;
      const message = extractApiErrorMessage(
        error,
        "과제 제출에 실패했습니다.",
      );

      throw new AssignmentSubmissionClientError(message, code);
    }

    const fallbackMessage =
      error instanceof Error ? error.message : "과제 제출에 실패했습니다.";

    throw new AssignmentSubmissionClientError(fallbackMessage);
  }
};

export const useSubmitAssignment = () =>
  useMutation<AssignmentSubmissionResponse, AssignmentSubmissionClientError, SubmitAssignmentVariables>({
    mutationFn: postAssignmentSubmission,
  });
