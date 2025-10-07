"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  CourseResponseSchema,
  type CourseResponse,
} from "@/features/instructor-courses/lib/dto";
import { INSTRUCTOR_COURSES_QUERY_KEY } from "@/features/instructor-courses/constants";
import type { CourseFormValues } from "@/features/instructor-courses/lib/validators";
import { toast } from "@/hooks/use-toast";

const updateCourseRequest = async ({
  courseId,
  payload,
}: {
  courseId: string;
  payload: Partial<CourseFormValues>;
}) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.patch<CourseResponse>(
      `/api/instructor/courses/${courseId}`,
      payload,
      authConfig,
    );

    return CourseResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to update course.",
    );
    throw new Error(message);
  }
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCourseRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSTRUCTOR_COURSES_QUERY_KEY });
      toast({
        title: "Course updated",
        description: "Course information saved successfully.",
      });
    },
  });
};
