import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getAccessTokenFromContext } from '@/backend/http/access-token';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import { instructorDashboardErrorCodes } from '@/features/instructor-dashboard/backend/error';
import { getInstructorDashboard } from '@/features/instructor-dashboard/backend/service';
import { fetchInstructorProfileByAuthId } from '@/features/instructor/common/repository';

export const registerInstructorDashboardRoutes = (app: Hono<AppEnv>) => {
  app.get('/instructor/dashboard', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);

    if (!accessToken) {
      return respond(
        c,
        failure(
          401,
          instructorDashboardErrorCodes.unauthorized,
          'Login is required to access the instructor dashboard.',
        ),
      );
    }

    const authUserResult = await supabase.auth.getUser(accessToken);

    if (authUserResult.error || !authUserResult.data.user) {
      logger.warn(
        'Instructor dashboard request failed to resolve auth user.',
        authUserResult.error ?? undefined,
      );

      return respond(
        c,
        failure(
          401,
          instructorDashboardErrorCodes.authUserLookupFailed,
          'Valid authentication is required.',
          authUserResult.error?.message,
        ),
      );
    }

    let instructorProfile;

    try {
      instructorProfile = await fetchInstructorProfileByAuthId(
        supabase,
        authUserResult.data.user.id,
      );
    } catch (error) {
      logger.error('Failed to fetch instructor profile for dashboard.', error);
      return respond(
        c,
        failure(
          500,
          instructorDashboardErrorCodes.profileLookupFailed,
          'Failed to load instructor profile.',
        ),
      );
    }

    if (!instructorProfile) {
      return respond(
        c,
        failure(
          403,
          instructorDashboardErrorCodes.profileNotFound,
          'Instructor profile is not registered.',
        ),
      );
    }

    const result = await getInstructorDashboard({
      client: supabase,
      logger,
      instructorId: instructorProfile.instructorId,
    });

    return respond(c, result);
  });
};
