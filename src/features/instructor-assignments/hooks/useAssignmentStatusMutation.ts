"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { apiClient, isAxiosError, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import { INSTRUCTOR_ASSIGNMENTS_QUERY_KEY } from "@/features/instructor-assignments/constants";
import type { AssignmentStatus } from "@/features/instructor-assignments/lib/dto";
import {
  parseAssignmentStatusResponse,
  type AssignmentStatusPayload,
  type AssignmentStatusResult,
} from "@/features/instructor-assignments/lib/status-dto";
import { toast } from "@/hooks/use-toast";

type MutationVariables = {
  assignmentId: string;
  nextStatus: AssignmentStatus;
};

type AssignmentStatusRequestError = Error & {
  code?: string;
};

const buildStatusPayload = (nextStatus: AssignmentStatus): AssignmentStatusPayload => ({
  nextStatus,
});

const toAssignmentStatusError = (error: unknown, fallbackMessage: string): AssignmentStatusRequestError => {
  if (isAxiosError(error)) {
    const payload = (error.response?.data as { error?: { code?: string; message?: string } } | undefined)?.error;
    const message = payload?.message ?? fallbackMessage;

    const enrichedError = new Error(message) as AssignmentStatusRequestError;
    if (typeof payload?.code === "string") {
      enrichedError.code = payload.code;
    }

    return enrichedError;
  }

  const resolvedMessage = extractApiErrorMessage(error, fallbackMessage);
  return new Error(resolvedMessage) as AssignmentStatusRequestError;
};

const mapSuccessMessage = (status: AssignmentStatus) =>
  match(status)
    .with("published", () => "Assignment is now published.")
    .with("closed", () => "Assignment submissions are now closed.")
    .otherwise(() => "Assignment status updated.");

const mapErrorMessage = (code: string | undefined, fallback: string) =>
  match(code)
    .with("INSTRUCTOR_ASSIGNMENTS_PUBLISH_REQUIREMENTS_INCOMPLETE", () =>
      "Fill in all required assignment information before publishing."
    )
    .with("INSTRUCTOR_ASSIGNMENTS_STATUS_TRANSITION_INVALID", () =>
      "This status change is not allowed for the current assignment state."
    )
    .otherwise(() => fallback);

const changeInstructorAssignmentStatusRequest = async (
  courseId: string,
  variables: MutationVariables
): Promise<AssignmentStatusResult> => {
  const authConfig = await createAuthRequestConfig();

  try {
    const { data } = await apiClient.patch<AssignmentStatusResult>(
      `/api/instructor/courses/${courseId}/assignments/${variables.assignmentId}/status`,
      buildStatusPayload(variables.nextStatus),
      authConfig
    );

    return parseAssignmentStatusResponse(data);
  } catch (error) {
    throw toAssignmentStatusError(error, "Failed to update assignment status.");
  }
};

export const useAssignmentStatusMutation = (courseId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: MutationVariables) => {
      if (!courseId) {
        throw new Error("Course identifier is required.");
      }

      return changeInstructorAssignmentStatusRequest(courseId, variables);
    },
    onSuccess: (_, variables) => {
      if (courseId) {
        void queryClient.invalidateQueries({
          queryKey: INSTRUCTOR_ASSIGNMENTS_QUERY_KEY(courseId),
        });
      }

      toast({
        title: "Status updated",
        description: mapSuccessMessage(variables.nextStatus),
      });
    },
    onError: (error) => {
      const code = (error as AssignmentStatusRequestError).code;
      const description = mapErrorMessage(
        code,
        error instanceof Error ? error.message : "Failed to update assignment status."
      );

      toast({
        title: "Status update failed",
        description,
        variant: "destructive",
      });
    },
  });
};

