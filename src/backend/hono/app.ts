import { Hono } from 'hono';
import { errorBoundary } from '@/backend/middleware/error';
import { withAppContext } from '@/backend/middleware/context';
import { withSupabase } from '@/backend/middleware/supabase';
import type { AppEnv } from '@/backend/hono/context';
import { registerDashboardRoutes } from '@/features/dashboard/backend/route';
import { registerExampleRoutes } from '@/features/example/backend/route';
import { registerCourseRoutes } from '@/features/courses/backend/route';
import { registerAssignmentRoutes } from '@/features/assignments/backend/route';
import { registerAssignmentSubmissionRoutes } from '@/features/assignments/backend/submission-route';
import { registerOnboardingRoutes } from '@/features/onboarding/backend/route';
import { registerGradeRoutes } from '@/features/grades/backend/route';

let singletonApp: Hono<AppEnv> | null = null;

export const createHonoApp = () => {
  const shouldReuseSingleton =
    process.env.NODE_ENV === 'production' && singletonApp !== null;

  if (shouldReuseSingleton && singletonApp) {
    return singletonApp;
  }

  const app = new Hono<AppEnv>();

  app.use('*', errorBoundary());
  app.use('*', withAppContext());
  app.use('*', withSupabase());

  const api = app.basePath('/api');

  registerOnboardingRoutes(api);
  registerDashboardRoutes(api);
  registerExampleRoutes(api);
  registerCourseRoutes(api);
  registerAssignmentRoutes(api);
  registerAssignmentSubmissionRoutes(api);
  registerGradeRoutes(api);

  if (process.env.NODE_ENV === 'production') {
    singletonApp = app;
  }

  return app;
};