"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import { DashboardOverviewResponseSchema } from "@/features/dashboard/lib/dto";
import {
  mapDashboardOverview,
  type DashboardOverviewViewModel,
} from "@/features/dashboard/lib/mappers";

const DASHBOARD_QUERY_KEY = ["dashboard", "overview"] as const;
const STALE_TIME_MS = 60_000;

const fetchDashboardOverview = async (): Promise<DashboardOverviewViewModel> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get("/api/dashboard/overview", authConfig);

    const parsed = DashboardOverviewResponseSchema.parse(data);

    return mapDashboardOverview(parsed);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to load learner dashboard overview.",
    );
    throw new Error(message);
  }
};

export const useDashboardOverview = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardOverview,
    staleTime: STALE_TIME_MS,
  });