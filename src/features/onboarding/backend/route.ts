import type { Hono } from "hono";
import {
  respond,
  failure,
  type ErrorResult,
} from "@/backend/http/response";
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from "@/backend/hono/context";
import { processOnboarding } from "@/features/onboarding/backend/service";
import {
  onboardingErrorCodes,
  type OnboardingErrorValue,
} from "@/features/onboarding/backend/error";

export const registerOnboardingRoutes = (app: Hono<AppEnv>) => {
  app.post("/onboarding", async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch (error) {
      logger.warn?.("onboarding.invalid_json", error);
      return respond(
        c,
        failure(
          400,
          onboardingErrorCodes.invalidPayload,
          "요청 본문을 읽을 수 없습니다.",
          error instanceof Error ? error.message : error
        )
      );
    }

    const result = await processOnboarding({ supabase, logger }, payload);

    if (!result.ok) {
      const { error } = result as ErrorResult<OnboardingErrorValue, unknown>;

      logger.error?.("onboarding.failed", error);
    } else {
      logger.info?.("onboarding.success", {
        role: result.data.role,
        redirectPath: result.data.redirectPath,
      });
    }

    return respond(c, result);
  });
};
