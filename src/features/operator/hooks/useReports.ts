"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import { operatorQueryKeys } from "@/features/operator/hooks/query-keys";
import {
  OperatorReportFilterSchema,
  OperatorReportListResponseSchema,
  type OperatorReportFilter,
  type OperatorReportListResponse,
} from "@/features/operator/lib/dto";
import { OPERATOR_API_PATHS } from "@/features/operator/constants";

const buildQueryString = (filters: OperatorReportFilter) => {
  const parsed = OperatorReportFilterSchema.safeParse(filters);

  if (!parsed.success) {
    return "";
  }

  const params = new URLSearchParams();

  if (parsed.data.status) {
    params.set("status", parsed.data.status);
  }

  if (parsed.data.targetType) {
    params.set("targetType", parsed.data.targetType);
  }

  if (parsed.data.search) {
    params.set("search", parsed.data.search);
  }

  return params.toString();
};

const fetchReports = async (
  filters: OperatorReportFilter,
): Promise<OperatorReportListResponse> => {
  try {
    const queryString = buildQueryString(filters);
    const authConfig = await createAuthRequestConfig();
    const url =
      queryString.length > 0
        ? `${OPERATOR_API_PATHS.reports}?${queryString}`
        : OPERATOR_API_PATHS.reports;
    const { data } = await apiClient.get(url, authConfig);
    const parsed = OperatorReportListResponseSchema.parse(data);
    return parsed;
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "신고 목록을 불러오지 못했습니다.",
    );
    throw new Error(message);
  }
};

export const useOperatorReports = (filters: OperatorReportFilter) => {
  const stableFilters = useMemo(() => filters, [filters]);

  return useQuery<OperatorReportListResponse>({
    queryKey: operatorQueryKeys.reports(stableFilters),
    queryFn: () => fetchReports(stableFilters),
    staleTime: 30_000,
  });
};
