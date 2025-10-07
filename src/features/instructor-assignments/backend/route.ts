import type { Hono } from 'hono';
import { getAccessTokenFromContext } from '@/backend/http/access-token';
import { respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import {
  createInstructorAssignment,
  getInstructorAssignments,
  updateInstructorAssignment,
} from '@/features/instructor-assignments/backend/service';

export const registerInstructorAssignmentRoutes = (app: Hono<AppEnv>) => {
  app.get('/instructor/courses/:courseId/assignments', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);
    const courseId = c.req.param('courseId');

    const result = await getInstructorAssignments({
      client: supabase,
      logger,
      courseId,
      accessToken,
    });

    return respond(c, result);
  });

  app.post('/instructor/courses/:courseId/assignments', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);
    const courseId = c.req.param('courseId');
    const body = await c.req.json().catch(() => undefined);

    const result = await createInstructorAssignment({
      client: supabase,
      logger,
      courseId,
      accessToken,
      body,
    });

    return respond(c, result);
  });

  app.patch('/instructor/courses/:courseId/assignments/:assignmentId', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);
    const courseId = c.req.param('courseId');
    const assignmentId = c.req.param('assignmentId');
    const body = await c.req.json().catch(() => undefined);

    const result = await updateInstructorAssignment({
      client: supabase,
      logger,
      courseId,
      assignmentId,
      accessToken,
      body,
    });

    return respond(c, result);
  });
};
