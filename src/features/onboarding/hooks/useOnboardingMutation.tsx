"use client";

import { useMutation } from "@tanstack/react-query";
import {
  apiClient,
  extractApiErrorMessage,
  isAxiosError,
} from "@/lib/remote/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  OnboardingRequestSchema,
  OnboardingResponseSchema,
  onboardingErrorCodes,
  type OnboardingRequest,
  type OnboardingResponse,
  type OnboardingServiceError,
} from "@/features/onboarding/lib/dto";

const mapOnboardingError = (error: unknown) => {
  if (isAxiosError(error)) {
    const payload = error.response?.data as
      | {
          error?: {
            code?: OnboardingServiceError;
            message?: string;
          };
        }
      | undefined;

    const serviceCode = payload?.error?.code;
    const status = error.response?.status;

    if (serviceCode === onboardingErrorCodes.authUserNotFound) {
      return "이메일 인증이 완료되지 않았거나 존재하지 않는 계정입니다.";
    }

    if (serviceCode === onboardingErrorCodes.authUserLookupFailed) {
      return "인증 서비스와 통신하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (serviceCode === onboardingErrorCodes.profileInsertFailed) {
      return "프로필 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (serviceCode === onboardingErrorCodes.profileValidationFailed) {
      return "저장된 프로필 데이터가 유효하지 않습니다.";
    }

    if (serviceCode === onboardingErrorCodes.profileAlreadyExists || status === 409) {
      return "이미 온보딩을 완료한 계정입니다. 로그인 후 이용해 주세요.";
    }

    if (serviceCode === onboardingErrorCodes.invalidPayload || status === 400) {
      return "입력값을 다시 확인해 주세요.";
    }
  }

  return extractApiErrorMessage(
    error,
    "온보딩 요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요."
  );
};

const postOnboarding = async (
  payload: OnboardingRequest
): Promise<OnboardingResponse> => {
  try {
    const parsedPayload = OnboardingRequestSchema.parse(payload);
    const { data } = await apiClient.post("/api/onboarding", parsedPayload);
    const parsedResponse = OnboardingResponseSchema.parse(data);

    if (
      parsedResponse.accessToken &&
      parsedResponse.refreshToken &&
      parsedResponse.expiresIn &&
      parsedResponse.expiresAt
    ) {
      const supabase = getSupabaseBrowserClient();
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: parsedResponse.accessToken,
        refresh_token: parsedResponse.refreshToken,
      });

      if (setSessionError) {
        throw new Error(setSessionError.message);
      }
    }

    return parsedResponse;
  } catch (error) {
    throw new Error(mapOnboardingError(error));
  }
};

export const useOnboardingMutation = () =>
  useMutation({
    mutationKey: ["onboarding", "submit"],
    mutationFn: postOnboarding,
  });
