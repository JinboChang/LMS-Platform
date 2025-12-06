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
      return "The account is unverified or does not exist. Please verify your email.";
    }

    if (serviceCode === onboardingErrorCodes.authUserLookupFailed) {
      return "We could not reach the authentication service. Please try again soon.";
    }

    if (serviceCode === onboardingErrorCodes.profileInsertFailed) {
      return "Failed to save your profile. Please try again.";
    }

    if (serviceCode === onboardingErrorCodes.profileValidationFailed) {
      return "Stored profile data is invalid.";
    }

    if (serviceCode === onboardingErrorCodes.profileAlreadyExists || status === 409) {
      return "This account already completed onboarding. Please log in.";
    }

    if (serviceCode === onboardingErrorCodes.invalidPayload || status === 400) {
      return "Please double-check your inputs.";
    }
  }

  return extractApiErrorMessage(
    error,
    "We could not process the onboarding request. Please try again."
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
