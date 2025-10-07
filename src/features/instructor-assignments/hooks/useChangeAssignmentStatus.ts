"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  AssignmentResponseSchema,
  type AssignmentResponse,
  type AssignmentStatus,
} from "@/features/instructor-assignments/lib/dto";
import { INSTRUCTOR_ASSIGNMENTS_QUERY_KEY } from "@/features/instructor-assignments/constants";
import { toast } from "@/hooks/use-toast";

const changeAssignmentStatusRequest = async ({
  courseId,
  assignmentId,
  nextStatus,
}: {
  courseId: string;
  assignmentId: string;
  nextStatus: AssignmentStatus;
}) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.patch<AssignmentResponse>(
      `/api/instructor/courses/${courseId}/assignments/${assignmentId}/status`,
      { nextStatus },
      authConfig,
    );

    return AssignmentResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to update assignment status.",
    );
    throw new Error(message);
  }
};

export const useChangeAssignmentStatus = (courseId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, nextStatus }: { assignmentId: string; nextStatus: AssignmentStatus }) => {
      if (!courseId) {
        throw new Error("Course identifier is required.");
      }

      return changeAssignmentStatusRequest({ courseId, assignmentId, nextStatus });
    },
    onSuccess: (_, variables) => {
      if (courseId) {
        void queryClient.invalidateQueries({
          queryKey: INSTRUCTOR_ASSIGNMENTS_QUERY_KEY(courseId),
        });
      }

      toast({
        title: "Assignment status updated",
        description: `Assignment moved to ${variables.nextStatus}.`,
      });
    },
  });
};
