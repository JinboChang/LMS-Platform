import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getAccessTokenFromContext } from '@/backend/http/access-token';
import { getLogger, getSupabase, type AppEnv } from '@/backend/hono/context';
import { dashboardErrorCodes } from '@/features/dashboard/backend/error';
import { fetchLearnerProfileByAuthId } from '@/features/dashboard/backend/repository';
import { getDashboardOverview } from '@/features/dashboard/backend/service';

export const registerDashboardRoutes = (app: Hono<AppEnv>) => {
  app.get('/dashboard/overview', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessTokenFromContext(c);

    if (!accessToken) {
      return respond(
        c,
        failure(
          401,
          dashboardErrorCodes.unauthorized,
          'Login is required.',
        ),
      );
    }

    const authUserResult = await supabase.auth.getUser(accessToken);

    if (authUserResult.error || !authUserResult.data.user) {
      logger.warn(
        'Dashboard overview request failed to resolve auth user.',
        authUserResult.error ?? undefined,
      );

      return respond(
        c,
        failure(
          401,
          dashboardErrorCodes.authUserLookupFailed,
          'Valid authentication is required.',
          authUserResult.error?.message,
        ),
      );
    }

    let learnerProfile;

    try {
      learnerProfile = await fetchLearnerProfileByAuthId(
        supabase,
        authUserResult.data.user.id,
      );
    } catch (error) {
      logger.error('Failed to fetch learner profile for dashboard.', error);
      return respond(
        c,
        failure(
          500,
          dashboardErrorCodes.profileLookupFailed,
          'Failed to verify learner profile.',
        ),
      );
    }

    if (!learnerProfile) {
      return respond(
        c,
        failure(
          404,
          dashboardErrorCodes.profileNotFound,
          'Learner profile is not registered.',
        ),
      );
    }

    const result = await getDashboardOverview({
      client: supabase,
      logger,
      learnerId: learnerProfile.learnerId,
    });

    return respond(c, result);
  });
};
