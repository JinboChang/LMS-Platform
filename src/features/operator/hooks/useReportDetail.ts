"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import { operatorQueryKeys } from "@/features/operator/hooks/query-keys";
import {
  OperatorReportDetailSchema,
  type OperatorReportDetail,
} from "@/features/operator/lib/dto";
import { OPERATOR_API_PATHS } from "@/features/operator/constants";

const buildReportDetailPath = (reportId: string) =>
  OPERATOR_API_PATHS.reports.replace("/reports", `/reports/${reportId}`);

const fetchReportDetail = async (
  reportId: string,
): Promise<OperatorReportDetail> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get(
      buildReportDetailPath(reportId),
      authConfig,
    );
    return OperatorReportDetailSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "Failed to load report detail.",
    );
    throw new Error(message);
  }
};

export const useOperatorReportDetail = (reportId: string | null) =>
  useQuery({
    queryKey: reportId
      ? operatorQueryKeys.reportDetail(reportId)
      : ["operator", "reports", "detail", "empty"],
    queryFn: () => {
      if (!reportId) {
        throw new Error("Report ID is required.");
      }

      return fetchReportDetail(reportId);
    },
    enabled: Boolean(reportId),
    staleTime: 15_000,
  });
