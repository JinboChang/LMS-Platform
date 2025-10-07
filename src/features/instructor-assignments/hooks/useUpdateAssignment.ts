"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  AssignmentResponseSchema,
  type AssignmentResponse,
} from "@/features/instructor-assignments/lib/dto";
import { INSTRUCTOR_ASSIGNMENTS_QUERY_KEY } from "@/features/instructor-assignments/constants";
import type { AssignmentFormValues } from "@/features/instructor-assignments/lib/validators";
import { toast } from "@/hooks/use-toast";

const updateAssignmentRequest = async ({
  courseId,
  assignmentId,
  payload,
}: {
  courseId: string;
  assignmentId: string;
  payload: Partial<AssignmentFormValues>;
}) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.patch<AssignmentResponse>(
      `/api/instructor/courses/${courseId}/assignments/${assignmentId}`,
      payload,
      authConfig,
    );

    return AssignmentResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to update assignment.",
    );
    throw new Error(message);
  }
};

export const useUpdateAssignment = (courseId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: Partial<AssignmentFormValues> }) => {
      if (!courseId) {
        throw new Error("Course identifier is required.");
      }

      return updateAssignmentRequest({ courseId, assignmentId, payload });
    },
    onSuccess: (_, variables) => {
      if (courseId) {
        void queryClient.invalidateQueries({
          queryKey: INSTRUCTOR_ASSIGNMENTS_QUERY_KEY(courseId),
        });
      }

      toast({
        title: "Assignment updated",
        description: "Assignment details saved successfully.",
      });
    },
  });
};
