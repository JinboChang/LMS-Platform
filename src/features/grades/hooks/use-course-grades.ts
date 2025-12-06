"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  apiClient,
  extractApiErrorMessage,
  isAxiosError,
} from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  parseCourseGradesResponse,
  type CourseGradesResponse,
} from "@/features/grades/lib/dto";

type CourseGradesError = Error & {
  status?: number;
  code?: string;
};

const fetchCourseGrades = async (
  courseId: string,
): Promise<CourseGradesResponse> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get(
      `/api/courses/${courseId}/grades`,
      authConfig,
    );
    return parseCourseGradesResponse(data);
  } catch (error) {
    if (isAxiosError(error)) {
      const message = extractApiErrorMessage(
        error,
        "Failed to load course grades.",
      );
      const enrichedError: CourseGradesError = new Error(message);
      enrichedError.status = error.response?.status;
      enrichedError.code =
        typeof error.response?.data?.error?.code === "string"
          ? error.response?.data?.error?.code
          : undefined;
      throw enrichedError;
    }

    throw new Error(
      extractApiErrorMessage(error, "Failed to load course grades."),
    );
  }
};

export const useCourseGrades = (
  courseId: string | null | undefined,
): UseQueryResult<CourseGradesResponse, CourseGradesError> =>
  useQuery({
    queryKey: ["grades", "course", courseId],
    queryFn: () => fetchCourseGrades(courseId ?? ""),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });
