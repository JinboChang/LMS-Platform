import type { Hono } from 'hono';
import { getAccessTokenFromContext } from '@/backend/http/access-token';
import { respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import { changeInstructorAssignmentStatus } from '@/features/instructor-assignments/backend/status-service';

export const registerInstructorAssignmentStatusRoutes = (app: Hono<AppEnv>) => {
  app.patch(
    '/instructor/courses/:courseId/assignments/:assignmentId/status',
    async (c) => {
      const supabase = getSupabase(c);
      const logger = getLogger(c);
      const accessToken = getAccessTokenFromContext(c);
      const courseId = c.req.param('courseId');
      const assignmentId = c.req.param('assignmentId');
      const body = await c.req.json().catch(() => undefined);

      const result = await changeInstructorAssignmentStatus({
        client: supabase,
        logger,
        courseId,
        assignmentId,
        accessToken,
        body,
      });

      return respond(c, result);
    },
  );
};

