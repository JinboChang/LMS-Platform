import { z } from "zod";
import type { Hono } from "hono";
import {
  failure,
  respond,
} from "@/backend/http/response";
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from "@/backend/hono/context";
import { submitAssignment } from "@/features/assignments/backend/submission-service";
import { assignmentSubmissionErrorCodes } from "@/features/assignments/backend/submission-error";

const AssignmentParamsSchema = z.object({
  assignmentId: z.string().uuid(),
});

export const registerAssignmentSubmissionRoutes = (app: Hono<AppEnv>) => {
  app.post("/assignments/:assignmentId/submissions", async (c) => {
    const parsedParams = AssignmentParamsSchema.safeParse({
      assignmentId: c.req.param("assignmentId"),
    });

    if (!parsedParams.success) {
      return respond(
        c,
        failure(
          400,
          assignmentSubmissionErrorCodes.invalidParams,
          "과제 식별자가 올바르지 않습니다.",
          parsedParams.error.format(),
        ),
      );
    }

    let body: unknown;

    try {
      body = await c.req.json();
    } catch (error) {
      return respond(
        c,
        failure(
          400,
          assignmentSubmissionErrorCodes.invalidPayload,
          "요청 본문을 해석할 수 없습니다.",
          error instanceof Error ? error.message : error,
        ),
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await submitAssignment(
      { supabase, logger },
      parsedParams.data.assignmentId,
      body,
    );

    return respond(c, result);
  });
};
