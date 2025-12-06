"use server";

import type { Hono } from "hono";
import { z } from "zod";
import {
  failure,
  respond,
  success,
  type ErrorResult,
  type HandlerResult,
} from "@/backend/http/response";
import {
  getLogger,
  getSupabase,
  type AppContext,
  type AppEnv,
} from "@/backend/hono/context";
import {
  operatorErrorCodes,
  type OperatorServiceError,
} from "@/features/operator/backend/error";
import {
  createOperatorCategory,
  createOperatorDifficulty,
  getOperatorCategories,
  getOperatorDifficultyLevels,
  getOperatorReportDetail,
  getOperatorReports,
  recordOperatorReportAction,
  requireOperator,
  updateOperatorCategory,
  updateOperatorDifficulty,
  updateOperatorReportStatus,
} from "@/features/operator/backend/service";

const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split("=");
      const value = rest.join("=");

      if (!key) {
        return acc;
      }

      try {
        acc.set(key, decodeURIComponent(value ?? ""));
      } catch (_error) {
        acc.set(key, value ?? "");
      }

      return acc;
    }, new Map<string, string>());
};

const getAccessToken = (c: AppContext) => {
  const authorization = c.req.header("authorization");

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();

    if (token) {
      return token;
    }
  }

  const cookieHeader = c.req.header("cookie");
  const cookies = parseCookies(cookieHeader);

  const accessToken = cookies.get("sb-access-token");

  if (accessToken) {
    return accessToken;
  }

  const legacyToken = cookies.get("supabase-auth-token");

  if (!legacyToken) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(legacyToken) as { access_token?: string };
    return parsed.access_token;
  } catch (_error) {
    return undefined;
  }
};

type OperatorRequestContext = {
  supabase: ReturnType<typeof getSupabase>;
  logger: ReturnType<typeof getLogger>;
  operator: {
    operatorId: string;
    authUserId: string;
    name: string;
    email: string;
  };
};

const resolveOperatorRequest = async (
  c: AppContext,
): Promise<HandlerResult<OperatorRequestContext, OperatorServiceError, unknown>> => {
  const supabase = getSupabase(c);
  const logger = getLogger(c);
  const token = getAccessToken(c);

  if (!token) {
    return failure(
      401,
      operatorErrorCodes.unauthorized,
      "Operator endpoints require sign-in.",
    );
  }

  const authResult = await supabase.auth.getUser(token);

  if (authResult.error || !authResult.data.user) {
    logger.warn("Failed to resolve operator auth user.", authResult.error ?? undefined);

    return failure(
      401,
      operatorErrorCodes.unauthorized,
      "Authentication is invalid or expired.",
      authResult.error?.message,
    );
  }

  const operatorResult = await requireOperator(
    supabase,
    authResult.data.user.id,
  );

  if (!operatorResult.ok) {
    const errorResult = operatorResult as ErrorResult<
      OperatorServiceError,
      unknown
    >;

    return failure(
      errorResult.status,
      errorResult.error.code,
      errorResult.error.message,
      errorResult.error.details,
    );
  }

  return success({
    supabase,
    logger,
    operator: operatorResult.data,
  });
};

const parseUuid = (value: string | undefined, field: string) => {
  const parsed = z
    .string()
    .uuid()
    .safeParse(value);

  if (!parsed.success) {
    return failure(
      400,
      operatorErrorCodes.validationError,
      `${field} must be a valid UUID.`,
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export async function registerOperatorRoutes(app: Hono<AppEnv>) {
  app.get("/operator/reports", async (c) => {
    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await getOperatorReports(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      c.req.query(),
    );

    return respond(c, result);
  });

  app.get("/operator/reports/:reportId", async (c) => {
    const reportIdResult = parseUuid(c.req.param("reportId"), "reportId");

    if (!reportIdResult.ok) {
      return respond(c, reportIdResult);
    }

    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await getOperatorReportDetail(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      reportIdResult.data,
    );

    return respond(c, result);
  });

  app.patch("/operator/reports/:reportId", async (c) => {
    const reportIdResult = parseUuid(c.req.param("reportId"), "reportId");

    if (!reportIdResult.ok) {
      return respond(c, reportIdResult);
    }

    const body = await c.req.json().catch(() => undefined);

    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await updateOperatorReportStatus(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      reportIdResult.data,
      body,
    );

    return respond(c, result);
  });

  app.post("/operator/reports/:reportId/actions", async (c) => {
    const reportIdResult = parseUuid(c.req.param("reportId"), "reportId");

    if (!reportIdResult.ok) {
      return respond(c, reportIdResult);
    }

    const body = await c.req.json().catch(() => undefined);

    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await recordOperatorReportAction(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      reportIdResult.data,
      body,
    );

    return respond(c, result);
  });

  app.get("/operator/categories", async (c) => {
    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await getOperatorCategories({
      client: contextResult.data.supabase,
      logger: contextResult.data.logger,
      operator: contextResult.data.operator,
    });

    return respond(c, result);
  });

  app.post("/operator/categories", async (c) => {
    const body = await c.req.json().catch(() => undefined);

    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await createOperatorCategory(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      body,
    );

    return respond(c, result);
  });

  app.patch("/operator/categories/:categoryId", async (c) => {
    const categoryIdResult = parseUuid(
      c.req.param("categoryId"),
      "categoryId",
    );

    if (!categoryIdResult.ok) {
      return respond(c, categoryIdResult);
    }

    const body = await c.req.json().catch(() => undefined);

    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await updateOperatorCategory(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      categoryIdResult.data,
      body,
    );

    return respond(c, result);
  });

  app.get("/operator/difficulty-levels", async (c) => {
    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await getOperatorDifficultyLevels({
      client: contextResult.data.supabase,
      logger: contextResult.data.logger,
      operator: contextResult.data.operator,
    });

    return respond(c, result);
  });

  app.post("/operator/difficulty-levels", async (c) => {
    const body = await c.req.json().catch(() => undefined);

    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await createOperatorDifficulty(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      body,
    );

    return respond(c, result);
  });

  app.patch("/operator/difficulty-levels/:difficultyId", async (c) => {
    const difficultyIdResult = parseUuid(
      c.req.param("difficultyId"),
      "difficultyId",
    );

    if (!difficultyIdResult.ok) {
      return respond(c, difficultyIdResult);
    }

    const body = await c.req.json().catch(() => undefined);

    const contextResult = await resolveOperatorRequest(c);

    if (!contextResult.ok) {
      return respond(c, contextResult);
    }

    const result = await updateOperatorDifficulty(
      {
        client: contextResult.data.supabase,
        logger: contextResult.data.logger,
        operator: contextResult.data.operator,
      },
      difficultyIdResult.data,
      body,
    );

    return respond(c, result);
  });
}
