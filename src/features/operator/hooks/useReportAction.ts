"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage, isAxiosError } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import { operatorQueryKeys } from "@/features/operator/hooks/query-keys";
import {
  OperatorReportActionPayloadSchema,
  OperatorReportDetailSchema,
  OperatorReportStatusPayloadSchema,
  type OperatorReportDetail,
  type OperatorReportStatus,
} from "@/features/operator/lib/dto";
import {
  OperatorReportProcessFormSchema,
  type OperatorReportProcessFormValues,
} from "@/features/operator/lib/validators";
import { OPERATOR_API_PATHS } from "@/features/operator/constants";

type ProcessReportInput = {
  reportId: string;
  currentStatus: OperatorReportStatus;
};

const buildStatusPath = (reportId: string) =>
  OPERATOR_API_PATHS.reports.replace("/reports", `/reports/${reportId}`);

const buildActionPath = (reportId: string) =>
  OPERATOR_API_PATHS.reportActions.replace(":reportId", reportId);

const updateReportStatus = async (
  reportId: string,
  status: OperatorReportStatus,
) => {
  const payload = OperatorReportStatusPayloadSchema.parse({ status });
  const authConfig = await createAuthRequestConfig();
  const { data } = await apiClient.patch(
    buildStatusPath(reportId),
    payload,
    authConfig,
  );
  return OperatorReportDetailSchema.parse(data);
};

const createReportAction = async (
  reportId: string,
  payload: OperatorReportProcessFormValues,
) => {
  const normalized = OperatorReportActionPayloadSchema.parse({
    actionType: payload.actionType,
    actionDetails: payload.actionDetails,
  });
  const authConfig = await createAuthRequestConfig();
  const { data } = await apiClient.post(
    buildActionPath(reportId),
    normalized,
    authConfig,
  );
  return OperatorReportDetailSchema.parse(data);
};

export const useOperatorReportAction = ({
  reportId,
  currentStatus,
}: ProcessReportInput) => {
  const queryClient = useQueryClient();

  return useMutation<OperatorReportDetail, Error, OperatorReportProcessFormValues>({
    mutationFn: async (values) => {
      try {
        const parsed = OperatorReportProcessFormSchema.parse(values);

        let latestDetail: OperatorReportDetail | null = null;

        if (parsed.status !== currentStatus) {
          latestDetail = await updateReportStatus(reportId, parsed.status);
        }

        const detailAfterAction = await createReportAction(reportId, parsed);

        return detailAfterAction ?? latestDetail;
      } catch (error) {
        if (isAxiosError(error) && error.response?.data?.error?.code) {
          const code = String(error.response.data.error.code);

          if (code === operatorErrorMessages.invalidStatusTransition.code) {
            throw new Error(operatorErrorMessages.invalidStatusTransition.message);
          }

          if (code === operatorErrorMessages.reportAlreadyResolved.code) {
            throw new Error(operatorErrorMessages.reportAlreadyResolved.message);
          }
        }

        const message = extractApiErrorMessage(
          error,
          "신고를 처리하지 못했습니다.",
        );

        throw new Error(message);
      }
    },
    onSuccess: async (detail) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["operator", "reports"],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: operatorQueryKeys.reportDetail(reportId),
        }),
      ]);

      queryClient.setQueryData(
        operatorQueryKeys.reportDetail(reportId),
        detail,
      );
    },
  });
};

const operatorErrorMessages = {
  invalidStatusTransition: {
    code: "operator/invalid-status-transition",
    message: "허용되지 않은 상태 전환입니다.",
  },
  reportAlreadyResolved: {
    code: "operator/report-already-resolved",
    message: "이미 처리 완료된 신고입니다.",
  },
} as const;
