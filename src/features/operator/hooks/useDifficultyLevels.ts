"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import { operatorQueryKeys } from "@/features/operator/hooks/query-keys";
import {
  OperatorDifficultyPayloadSchema,
  OperatorDifficultySchema,
  type OperatorDifficulty,
} from "@/features/operator/lib/dto";
import type { OperatorDifficultyFormValues } from "@/features/operator/lib/validators";
import { OPERATOR_API_PATHS } from "@/features/operator/constants";

const fetchDifficultyLevels = async (): Promise<OperatorDifficulty[]> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get(
      OPERATOR_API_PATHS.difficultyLevels,
      authConfig,
    );
    return OperatorDifficultySchema.array().parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "난이도 정보를 불러오지 못했습니다.",
    );
    throw new Error(message);
  }
};

const createDifficultyRequest = async (
  payload: OperatorDifficultyFormValues,
) => {
  try {
    const normalized = OperatorDifficultyPayloadSchema.parse(payload);
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.post(
      OPERATOR_API_PATHS.difficultyLevels,
      normalized,
      authConfig,
    );
    return OperatorDifficultySchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "난이도를 생성하지 못했습니다.",
    );
    throw new Error(message);
  }
};

const updateDifficultyRequest = async (
  difficultyId: string,
  payload: OperatorDifficultyFormValues,
) => {
  try {
    const normalized = OperatorDifficultyPayloadSchema.parse(payload);
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.patch(
      `${OPERATOR_API_PATHS.difficultyLevels}/${difficultyId}`,
      normalized,
      authConfig,
    );
    return OperatorDifficultySchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "난이도를 수정하지 못했습니다.",
    );
    throw new Error(message);
  }
};

export const useOperatorDifficultyLevels = () => {
  const queryClient = useQueryClient();

  const difficultyQuery = useQuery({
    queryKey: operatorQueryKeys.difficultyLevels,
    queryFn: fetchDifficultyLevels,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createDifficultyRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: operatorQueryKeys.difficultyLevels,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ difficultyId, values }: { difficultyId: string; values: OperatorDifficultyFormValues }) =>
      updateDifficultyRequest(difficultyId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: operatorQueryKeys.difficultyLevels,
      });
    },
  });

  return {
    difficultyQuery,
    createDifficulty: createMutation,
    updateDifficulty: updateMutation,
  };
};

