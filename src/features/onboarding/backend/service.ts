import type { SupabaseClient } from "@supabase/supabase-js";
import { match } from "ts-pattern";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import type { AppLogger } from "@/backend/hono/context";
import {
  OnboardingProfileRowSchema,
  OnboardingRequestSchema,
  type OnboardingResponse,
} from "@/features/onboarding/backend/schema";
import {
  onboardingErrorCodes,
  type OnboardingServiceError,
} from "@/features/onboarding/backend/error";
import {
  createSupabaseAdmin,
  findAuthUserByEmail,
  SupabaseAdminError,
  type SupabaseAdmin,
  updateUserRoleMetadata,
} from "@/features/onboarding/backend/supabase-admin";

const USERS_TABLE = "users";

const buildRedirectPath = (role: string) =>
  match(role)
    .with("learner", () => "/courses")
    .with("instructor", () => "/instructor/dashboard")
    .otherwise(() => "/");

const toIsoExpiry = (session: {
  expires_in: number;
  expires_at: number | null;
}) => {
  if (typeof session.expires_at === "number") {
    return new Date(session.expires_at * 1000).toISOString();
  }

  return new Date(Date.now() + session.expires_in * 1000).toISOString();
};

export type ProcessOnboardingDeps = {
  supabase: SupabaseClient;
  logger?: AppLogger;
  admin?: SupabaseAdmin;
};

export const processOnboarding = async (
  { supabase, logger, admin: providedAdmin }: ProcessOnboardingDeps,
  input: unknown
): Promise<
  HandlerResult<OnboardingResponse, OnboardingServiceError, unknown>
> => {
  const parsedPayload = OnboardingRequestSchema.safeParse(input);

  if (!parsedPayload.success) {
    return failure(
      400,
      onboardingErrorCodes.invalidPayload,
      "Onboarding request payload is invalid.",
      parsedPayload.error.format()
    );
  }

  const admin = providedAdmin ?? createSupabaseAdmin(supabase);
  const payload = parsedPayload.data;

  logger?.info?.("onboarding.request", {
    email: payload.email,
    role: payload.role,
    acceptedTerms: payload.acceptedTerms,
  });

  let createdUserId: string | null = null;
  let sessionTokens:
    | {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        expiresAt: string;
      }
    | null = null;

  try {
    const existingUser = await findAuthUserByEmail(supabase, payload.email);

    let authUserId = existingUser?.id ?? null;

    if (!authUserId) {
      const { user, session } = await admin.createUserWithSession({
        email: payload.email,
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        role: payload.role,
      });

      authUserId = user.id;
      createdUserId = user.id;

      sessionTokens = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
        expiresAt: toIsoExpiry({
          expires_in: session.expires_in,
          expires_at: session.expires_at ?? null,
        }),
      };
    }

    const existingProfile = await supabase
      .from(USERS_TABLE)
      .select("id, auth_user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (existingProfile.error) {
      throw new SupabaseAdminError(
        "Failed to check existing profile.",
        onboardingErrorCodes.profileValidationFailed,
        existingProfile.error
      );
    }

    if (existingProfile.data) {
      return failure(
        409,
        onboardingErrorCodes.profileAlreadyExists,
        "This account has already completed onboarding."
      );
    }

    const insertResult = await admin.ensureProfile({
      auth_user_id: authUserId,
      email: payload.email,
      name: payload.name,
      phone_number: payload.phoneNumber,
      role: payload.role,
    });

    const parsedProfile = OnboardingProfileRowSchema.safeParse(insertResult);

    if (!parsedProfile.success) {
      throw new SupabaseAdminError(
        "Stored onboarding data is invalid.",
        onboardingErrorCodes.profileValidationFailed,
        parsedProfile.error.format()
      );
    }

    try {
      await updateUserRoleMetadata(supabase, authUserId, payload.role);
    } catch (metadataError) {
      logger?.warn?.("onboarding.metadata_update_failed", metadataError);
    }

    const response: OnboardingResponse = {
      role: payload.role,
      redirectPath: buildRedirectPath(payload.role),
      ...(sessionTokens ?? {}),
    } satisfies OnboardingResponse;

    logger?.info?.("onboarding.completed", {
      userId: authUserId,
      profileId: parsedProfile.data.id,
      role: payload.role,
    });

    return success(response, 201);
  } catch (error) {
    if (createdUserId) {
      try {
        await admin.deleteUserById(createdUserId);
      } catch (rollbackError) {
        logger?.error?.("onboarding.rollback_failed", rollbackError);
        return failure(
          500,
          onboardingErrorCodes.profileRollbackFailed,
          "Failed to clean up created user.",
          rollbackError instanceof Error ? rollbackError.message : rollbackError
        );
      }
    }

    if (error instanceof SupabaseAdminError) {
      const mappedStatus = match(error.code)
        .with(onboardingErrorCodes.emailAlreadyExists, () => 409 as const)
        .with(onboardingErrorCodes.authCreateFailed, () => 500 as const)
        .with(onboardingErrorCodes.sessionCreateFailed, () => 500 as const)
        .with(onboardingErrorCodes.profileInsertFailed, () => 500 as const)
        .with(onboardingErrorCodes.profileValidationFailed, () => 500 as const)
        .with(onboardingErrorCodes.profileRollbackFailed, () => 500 as const)
        .otherwise(() => 500 as const);

      return failure(
        mappedStatus,
        error.code,
        error.message,
        error.details
      );
    }

    logger?.error?.("onboarding.unhandled_error", error);

    return failure(
      500,
      onboardingErrorCodes.unknown,
      "An unexpected error occurred while processing onboarding.",
      error instanceof Error ? error.message : error
    );
  }
};
