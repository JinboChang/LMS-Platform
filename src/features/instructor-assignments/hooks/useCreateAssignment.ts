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

const createAssignmentRequest = async ({
  courseId,
  payload,
}: {
  courseId: string;
  payload: AssignmentFormValues;
}) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.post<AssignmentResponse>(
      `/api/instructor/courses/${courseId}/assignments`,
      {
        ...payload,
        scoreWeight: payload.scoreWeight,
      },
      authConfig,
    );

    return AssignmentResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to create assignment.",
    );
    throw new Error(message);
  }
};

export const useCreateAssignment = (courseId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignmentFormValues) => {
      if (!courseId) {
        throw new Error("Course identifier is required.");
      }

      return createAssignmentRequest({ courseId, payload });
    },
    onSuccess: () => {
      if (courseId) {
        void queryClient.invalidateQueries({
          queryKey: INSTRUCTOR_ASSIGNMENTS_QUERY_KEY(courseId),
        });
      }

      toast({
        title: "Assignment created",
        description: "Draft assignment is ready for review.",
      });
    },
  });
};
