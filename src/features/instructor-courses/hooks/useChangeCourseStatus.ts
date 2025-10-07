"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  CourseResponseSchema,
  type CourseResponse,
} from "@/features/instructor-courses/lib/dto";
import { INSTRUCTOR_COURSES_QUERY_KEY } from "@/features/instructor-courses/constants";
import type { CourseStatus } from "@/features/instructor-courses/lib/dto";
import { toast } from "@/hooks/use-toast";

const changeStatusRequest = async ({
  courseId,
  nextStatus,
}: {
  courseId: string;
  nextStatus: CourseStatus;
}) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.patch<CourseResponse>(
      `/api/instructor/courses/${courseId}/status`,
      { nextStatus },
      authConfig,
    );

    return CourseResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to update course status.",
    );
    throw new Error(message);
  }
};

export const useChangeCourseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeStatusRequest,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: INSTRUCTOR_COURSES_QUERY_KEY });
      toast({
        title: "Status updated",
        description: `Course status changed to ${variables.nextStatus}.`,
      });
    },
  });
};
