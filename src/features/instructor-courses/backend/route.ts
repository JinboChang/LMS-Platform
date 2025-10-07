import type { Hono } from 'hono';
import { getAccessTokenFromContext } from '@/backend/http/access-token';
import { respond } from '@/backend/http/response';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import {
  changeInstructorCourseStatus,
  createInstructorCourse,
  getInstructorCourses,
  updateInstructorCourse,
} from '@/features/instructor-courses/backend/service';

export const registerInstructorCourseRoutes = (app: Hono<AppEnv>) => {
  app.get('/instructor/courses', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);

    const result = await getInstructorCourses({
      client: supabase,
      logger,
      accessToken,
    });

    return respond(c, result);
  });

  app.post('/instructor/courses', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);
    const body = await c.req.json().catch(() => undefined);

    const result = await createInstructorCourse({
      client: supabase,
      logger,
      accessToken,
      body,
    });

    return respond(c, result);
  });

  app.patch('/instructor/courses/:courseId', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);
    const body = await c.req.json().catch(() => undefined);
    const courseId = c.req.param('courseId');

    const result = await updateInstructorCourse({
      client: supabase,
      logger,
      accessToken,
      body,
      courseId,
    });

    return respond(c, result);
  });

  app.patch('/instructor/courses/:courseId/status', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);
    const body = await c.req.json().catch(() => undefined);
    const courseId = c.req.param('courseId');

    const result = await changeInstructorCourseStatus({
      client: supabase,
      logger,
      accessToken,
      body,
      courseId,
    });

    return respond(c, result);
  });
};
