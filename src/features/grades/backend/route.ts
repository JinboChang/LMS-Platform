import type { Hono } from "hono";
import {
  failure,
  respond,
  type ErrorResult,
} from "@/backend/http/response";
import {
  getLogger,
  getSupabase,
  type AppContext,
  type AppEnv,
} from "@/backend/hono/context";
import {
  getCourseGrades,
  getGradesOverview,
} from "@/features/grades/backend/service";
import {
  gradesErrorCodes,
  type GradesErrorCode,
} from "@/features/grades/backend/error";
import { CourseGradesParamsSchema } from "@/features/grades/backend/schema";

type AccessTokenContext = {
  accessToken?: string;
};

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

const getAccessToken = (c: AppContext): AccessTokenContext => {
  const authorization = c.req.header("authorization");

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();

    if (token) {
      return { accessToken: token };
    }
  }

  const cookieHeader = c.req.header("cookie");
  const cookies = parseCookies(cookieHeader);
  const supabaseAccessToken = cookies.get("sb-access-token");

  if (supabaseAccessToken) {
    return { accessToken: supabaseAccessToken };
  }

  const legacyToken = cookies.get("supabase-auth-token");

  if (legacyToken) {
    try {
      const parsed = JSON.parse(legacyToken) as { access_token?: string };

      if (typeof parsed.access_token === "string") {
        return { accessToken: parsed.access_token };
      }
    } catch (_error) {
      return { accessToken: undefined };
    }
  }

  return { accessToken: undefined };
};

export const registerGradeRoutes = (app: Hono<AppEnv>) => {
  app.get("/grades/overview", async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const context = getAccessToken(c);

    const result = await getGradesOverview({ supabase }, context);

    if (!result.ok && result.status >= 500) {
      const { error } = result as ErrorResult<GradesErrorCode, unknown>;

      logger.error("Failed to retrieve grades overview", error.message);
    }

    return respond(c, result);
  });

  app.get("/courses/:courseId/grades", async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const context = getAccessToken(c);
    const params = CourseGradesParamsSchema.safeParse({
      courseId: c.req.param("courseId"),
    });

    if (!params.success) {
      return respond(
        c,
        failure(
          400,
          gradesErrorCodes.invalidQuery,
          "Course grade request is invalid.",
          params.error.format(),
        ),
      );
    }

    const result = await getCourseGrades({ supabase }, params.data, context);

    if (!result.ok && result.status >= 500) {
      const { error } = result as ErrorResult<GradesErrorCode, unknown>;

      logger.error("Failed to retrieve course grades", error.message);
    }

    return respond(c, result);
  });
};
