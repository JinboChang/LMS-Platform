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

const createCourseRequest = async (input: CourseFormValues) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.post<CourseResponse>(
      "/api/instructor/courses",
      input,
      authConfig,
    );

    return CourseResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to create course.",
    );
    throw new Error(message);
  }
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourseRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSTRUCTOR_COURSES_QUERY_KEY });
      toast({
        title: "Course created",
        description: "Draft course was created successfully.",
      });
    },
  });
};
