"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  apiClient,
  extractApiErrorMessage,
  isAxiosError,
} from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  AssignmentDetailDtoSchema,
  type AssignmentDetailDto,
} from "@/features/assignments/lib/dto";

type FetchParams = {
  courseId: string;
  assignmentId: string;
};

type UseAssignmentDetailOptions = {
  enabled?: boolean;
};

export type AssignmentDetailError = Error & {
  status?: number;
  code?: string;
};

const fetchAssignmentDetail = async ({ courseId, assignmentId }: FetchParams) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get(
      `/api/courses/${courseId}/assignments/${assignmentId}`,
      authConfig,
    );

    return AssignmentDetailDtoSchema.parse(data);
  } catch (error) {
    if (isAxiosError(error)) {
      const message = extractApiErrorMessage(
        error,
        "과제 상세 정보를 불러오지 못했습니다.",
      );
      const enrichedError: AssignmentDetailError = new Error(message);
      enrichedError.status = error.response?.status;
      enrichedError.code =
        typeof error.response?.data?.error?.code === "string"
          ? error.response?.data?.error?.code
          : undefined;
      throw enrichedError;
    }

    throw new Error(
      extractApiErrorMessage(error, "과제 상세 정보를 불러오지 못했습니다."),
    );
  }
};

export const useAssignmentDetail = (
  params: Partial<FetchParams>,
  options?: UseAssignmentDetailOptions,
): UseQueryResult<AssignmentDetailDto, AssignmentDetailError> => {
  const enabled = Boolean(params.assignmentId && params.courseId);

  return useQuery({
    queryKey: ["assignments", "detail", params.courseId, params.assignmentId],
    queryFn: () =>
      fetchAssignmentDetail({
        courseId: params.courseId as string,
        assignmentId: params.assignmentId as string,
      }),
    enabled: (options?.enabled ?? true) && enabled,
    staleTime: 60 * 1000,
  });
};
