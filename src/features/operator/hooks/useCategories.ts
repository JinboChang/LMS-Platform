"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import { operatorQueryKeys } from "@/features/operator/hooks/query-keys";
import {
  OperatorCategoryPayloadSchema,
  OperatorCategorySchema,
  type OperatorCategory,
} from "@/features/operator/lib/dto";
import type { OperatorCategoryFormValues } from "@/features/operator/lib/validators";
import { OPERATOR_API_PATHS } from "@/features/operator/constants";

const fetchCategories = async (): Promise<OperatorCategory[]> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get(OPERATOR_API_PATHS.categories, authConfig);
    const parsed = OperatorCategorySchema.array().parse(data);
    return parsed;
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "코스 카테고리를 불러오지 못했습니다.",
    );
    throw new Error(message);
  }
};

const createCategoryRequest = async (payload: OperatorCategoryFormValues) => {
  try {
    const normalized = OperatorCategoryPayloadSchema.parse(payload);
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.post(
      OPERATOR_API_PATHS.categories,
      normalized,
      authConfig,
    );
    return OperatorCategorySchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "카테고리를 생성하지 못했습니다.",
    );
    throw new Error(message);
  }
};

const updateCategoryRequest = async (
  categoryId: string,
  payload: OperatorCategoryFormValues,
) => {
  try {
    const normalized = OperatorCategoryPayloadSchema.parse(payload);
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.patch(
      `${OPERATOR_API_PATHS.categories}/${categoryId}`,
      normalized,
      authConfig,
    );
    return OperatorCategorySchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "카테고리를 수정하지 못했습니다.",
    );
    throw new Error(message);
  }
};

export const useOperatorCategories = () => {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: operatorQueryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: operatorQueryKeys.categories,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ categoryId, values }: { categoryId: string; values: OperatorCategoryFormValues }) =>
      updateCategoryRequest(categoryId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: operatorQueryKeys.categories,
      });
    },
  });

  return {
    categoriesQuery,
    createCategory: createMutation,
    updateCategory: updateMutation,
  };
};
