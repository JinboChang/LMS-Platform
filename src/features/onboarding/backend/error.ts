export const onboardingErrorCodes = {
  invalidPayload: "ONBOARDING_INVALID_PAYLOAD",
  authUserLookupFailed: "ONBOARDING_AUTH_USER_LOOKUP_FAILED",
  authUserNotFound: "ONBOARDING_AUTH_USER_NOT_FOUND",
  emailAlreadyExists: "ONBOARDING_EMAIL_ALREADY_EXISTS",
  authCreateFailed: "ONBOARDING_AUTH_CREATE_FAILED",
  sessionCreateFailed: "ONBOARDING_SESSION_CREATE_FAILED",
  profileAlreadyExists: "ONBOARDING_PROFILE_ALREADY_EXISTS",
  profileInsertFailed: "ONBOARDING_PROFILE_INSERT_FAILED",
  profileValidationFailed: "ONBOARDING_PROFILE_VALIDATION_FAILED",
  profileRollbackFailed: "ONBOARDING_PROFILE_ROLLBACK_FAILED",
  unknown: "ONBOARDING_UNKNOWN_ERROR",
} as const;

export type OnboardingErrorValue =
  (typeof onboardingErrorCodes)[keyof typeof onboardingErrorCodes];

export type OnboardingServiceError = OnboardingErrorValue;
