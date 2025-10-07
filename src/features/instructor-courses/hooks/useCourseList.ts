"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  CourseListResponseSchema,
  type CourseListResponse,
} from "@/features/instructor-courses/lib/dto";
import { mapCourseListResponse } from "@/features/instructor-courses/lib/mappers";
import { INSTRUCTOR_COURSES_QUERY_KEY } from "@/features/instructor-courses/constants";

const fetchInstructorCourses = async () => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get<CourseListResponse>(
      "/api/instructor/courses",
      authConfig,
    );

    const parsed = CourseListResponseSchema.parse(data);

    return mapCourseListResponse(parsed);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to load instructor courses.",
    );
    throw new Error(message);
  }
};

export const useCourseList = () =>
  useQuery({
    queryKey: INSTRUCTOR_COURSES_QUERY_KEY,
    queryFn: fetchInstructorCourses,
    staleTime: 60_000,
  });
