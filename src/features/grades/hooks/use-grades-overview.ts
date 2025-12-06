"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  apiClient,
  extractApiErrorMessage,
  isAxiosError,
} from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  parseGradesOverviewResponse,
  type GradesOverviewResponse,
} from "@/features/grades/lib/dto";

type GradesOverviewError = Error & {
  status?: number;
  code?: string;
};

const fetchGradesOverview = async (): Promise<GradesOverviewResponse> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get("/api/grades/overview", authConfig);
    return parseGradesOverviewResponse(data);
  } catch (error) {
    if (isAxiosError(error)) {
      const message = extractApiErrorMessage(
        error,
        "Failed to load the grades overview.",
      );
      const enrichedError: GradesOverviewError = new Error(message);
      enrichedError.status = error.response?.status;
      enrichedError.code =
        typeof error.response?.data?.error?.code === "string"
          ? error.response?.data?.error?.code
          : undefined;
      throw enrichedError;
    }

    throw new Error(
      extractApiErrorMessage(error, "Failed to load the grades overview."),
    );
  }
};

export const useGradesOverview = (): UseQueryResult<
  GradesOverviewResponse,
  GradesOverviewError
> =>
  useQuery({
    queryKey: ["grades", "overview"],
    queryFn: fetchGradesOverview,
    staleTime: 60 * 1000,
  });
