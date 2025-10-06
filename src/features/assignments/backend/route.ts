import type { Hono } from "hono";
import {
  failure,
  respond,
  type ErrorResult,
} from "@/backend/http/response";
import {
  getLogger,
  getSupabase,
  type AppEnv,
  type AppContext,
} from "@/backend/hono/context";
import {
  AssignmentDetailParamsSchema,
  type AssignmentDetailParams,
} from "@/features/assignments/backend/schema";
import { getAssignmentDetail } from "@/features/assignments/backend/service";
import {
  assignmentErrorCodes,
  type AssignmentServiceError,
} from "@/features/assignments/backend/error";
import { fetchUserProfileByAuthId } from "@/features/assignments/backend/submission-repository";

const buildParams = (params: AssignmentDetailParams) => params;

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

export const registerAssignmentRoutes = (app: Hono<AppEnv>) => {
  app.get("/courses/:courseId/assignments/:assignmentId", async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessToken(c);

    if (!accessToken) {
      return respond(
        c,
        failure(
          401,
          assignmentErrorCodes.unauthorized,
          "Login is required to view assignment details.",
        ),
      );
    }

    const authUserResult = await supabase.auth.getUser(accessToken);

    if (authUserResult.error || !authUserResult.data.user) {
      logger.warn(
        "Failed to resolve authenticated user for assignment detail.",
        authUserResult.error ?? undefined,
      );

      return respond(
        c,
        failure(
          401,
          assignmentErrorCodes.unauthorized,
          "Valid authentication is required.",
          authUserResult.error?.message,
        ),
      );
    }

    const authUserId = authUserResult.data.user.id;

    let learnerProfile;

    try {
      learnerProfile = await fetchUserProfileByAuthId(supabase, authUserId);
    } catch (error) {
      logger.error("Failed to fetch learner profile for assignment detail.", error);
      return respond(
        c,
        failure(
          500,
          assignmentErrorCodes.repositoryError,
          "Failed to verify learner profile.",
        ),
      );
    }

    if (!learnerProfile) {
      return respond(
        c,
        failure(
          404,
          assignmentErrorCodes.learnerProfileNotFound,
          "Learner profile is not registered.",
        ),
      );
    }

    const requestedLearnerId = c.req.query("learnerId");

    if (requestedLearnerId && requestedLearnerId !== learnerProfile.id) {
      return respond(
        c,
        failure(
          403,
          assignmentErrorCodes.assignmentNotAccessible,
          "You do not have permission to view this assignment.",
        ),
      );
    }

    const parsedParams = AssignmentDetailParamsSchema.safeParse({
      courseId: c.req.param("courseId"),
      assignmentId: c.req.param("assignmentId"),
      learnerId: requestedLearnerId ?? learnerProfile.id,
    });

    if (!parsedParams.success) {
      return respond(
        c,
        failure(
          400,
          assignmentErrorCodes.validationError,
          "요청 파라미터가 올바르지 않습니다.",
          parsedParams.error.format(),
        ),
      );
    }

    const result = await getAssignmentDetail(
      supabase,
      buildParams(parsedParams.data),
    );

    if (!result.ok) {
      const errorResult = result as ErrorResult<AssignmentServiceError, unknown>;

      if (errorResult.status >= 500) {
        logger.error("과제 상세 조회 중 오류 발생", errorResult.error);
      }

      return respond(c, result);
    }

    return respond(c, result);
  });
};
