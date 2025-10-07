"use client";

import { useQuery } from "@tanstack/react-query";
import {
  INSTRUCTOR_DASHBOARD_DATA_STALE_TIME_MS,
} from "@/features/instructor-dashboard/constants";
import {
  InstructorDashboardResponseSchema,
} from "@/features/instructor-dashboard/lib/dto";
import {
  mapInstructorDashboard,
  type InstructorDashboardViewModel,
} from "@/features/instructor-dashboard/lib/mappers";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";

const INSTRUCTOR_DASHBOARD_QUERY_KEY = [
  "instructor-dashboard",
  "overview",
] as const;

const fetchInstructorDashboard = async (): Promise<InstructorDashboardViewModel> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get(
      "/api/instructor/dashboard",
      authConfig,
    );

    const parsed = InstructorDashboardResponseSchema.parse(data);

    return mapInstructorDashboard(parsed);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to load instructor dashboard.",
    );
    throw new Error(message);
  }
};

export const useInstructorDashboard = () =>
  useQuery({
    queryKey: INSTRUCTOR_DASHBOARD_QUERY_KEY,
    queryFn: fetchInstructorDashboard,
    staleTime: INSTRUCTOR_DASHBOARD_DATA_STALE_TIME_MS,
  });
