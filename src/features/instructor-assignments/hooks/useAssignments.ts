"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  type AssignmentListResponse,
  AssignmentListResponseSchema,
} from "@/features/instructor-assignments/lib/dto";
import { mapAssignmentListResponse } from "@/features/instructor-assignments/lib/mappers";
import { INSTRUCTOR_ASSIGNMENTS_QUERY_KEY } from "@/features/instructor-assignments/constants";

export const useAssignments = (courseId: string | null) =>
  useQuery({
    queryKey: INSTRUCTOR_ASSIGNMENTS_QUERY_KEY(courseId ?? ""),
    enabled: Boolean(courseId),
    queryFn: async () => {
      if (!courseId) {
        throw new Error("Course identifier is required.");
      }

      try {
        const authConfig = await createAuthRequestConfig();
        const { data } = await apiClient.get<AssignmentListResponse>(
          `/api/instructor/courses/${courseId}/assignments`,
          authConfig,
        );

        const parsed = AssignmentListResponseSchema.parse(data);
        return mapAssignmentListResponse(parsed);
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          "Failed to load assignments.",
        );
        throw new Error(message);
      }
    },
  });
