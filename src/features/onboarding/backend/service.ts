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
      "온보딩 요청 형식이 올바르지 않습니다.",
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
        "기존 프로필을 확인하는 중 오류가 발생했습니다.",
        onboardingErrorCodes.profileValidationFailed,
        existingProfile.error
      );
    }

    if (existingProfile.data) {
      return failure(
        409,
        onboardingErrorCodes.profileAlreadyExists,
        "이미 온보딩을 완료한 계정입니다."
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
        "저장된 온보딩 정보가 유효하지 않습니다.",
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
          "생성된 사용자를 정리하지 못했습니다.",
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
      "온보딩 처리 중 예기치 못한 오류가 발생했습니다.",
      error instanceof Error ? error.message : error
    );
  }
};
