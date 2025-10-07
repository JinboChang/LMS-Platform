import { z } from 'zod';
import type { Hono } from 'hono';
import { getAccessTokenFromContext } from '@/backend/http/access-token';
import { failure, respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import {
  getInstructorSubmissionDetail,
  gradeInstructorSubmission,
} from '@/features/instructor-grading/backend/service';
import { instructorGradingErrorCodes } from '@/features/instructor-grading/backend/error';

const AssignmentSubmissionParamsSchema = z.object({
  assignmentId: z.string().uuid(),
  submissionId: z.string().uuid(),
});

export const registerInstructorGradingRoutes = (app: Hono<AppEnv>) => {
  app.get('/instructor/assignments/:assignmentId/submissions/:submissionId', async (c) => {
    const parsedParams = AssignmentSubmissionParamsSchema.safeParse({
      assignmentId: c.req.param('assignmentId'),
      submissionId: c.req.param('submissionId'),
    });

    if (!parsedParams.success) {
      return respond(
        c,
        failure(
          400,
          instructorGradingErrorCodes.invalidParams,
          'Invalid submission identifier.',
          parsedParams.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await getInstructorSubmissionDetail({
      client: supabase,
      logger,
      assignmentId: parsedParams.data.assignmentId,
      submissionId: parsedParams.data.submissionId,
      accessToken: getAccessTokenFromContext(c),
    });

    return respond(c, result);
  });

  app.patch(
    '/instructor/assignments/:assignmentId/submissions/:submissionId/grade',
    async (c) => {
      const parsedParams = AssignmentSubmissionParamsSchema.safeParse({
        assignmentId: c.req.param('assignmentId'),
        submissionId: c.req.param('submissionId'),
      });

      if (!parsedParams.success) {
        return respond(
          c,
          failure(
            400,
            instructorGradingErrorCodes.invalidParams,
            'Invalid submission identifier.',
            parsedParams.error.format(),
          ),
        );
      }

      const supabase = getSupabase(c);
      const logger = getLogger(c);
      const body = await c.req.json().catch(() => undefined);

      const result = await gradeInstructorSubmission({
        client: supabase,
        logger,
        assignmentId: parsedParams.data.assignmentId,
        submissionId: parsedParams.data.submissionId,
        accessToken: getAccessTokenFromContext(c),
        body,
      });

      return respond(c, result);
    },
  );
};
