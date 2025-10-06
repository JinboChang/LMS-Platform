import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppContext,
  type AppEnv,
} from '@/backend/hono/context';
import { dashboardErrorCodes } from '@/features/dashboard/backend/error';
import { fetchLearnerProfileByAuthId } from '@/features/dashboard/backend/repository';
import { getDashboardOverview } from '@/features/dashboard/backend/service';

const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split('=');
      const value = rest.join('=');

      if (!key) {
        return acc;
      }

      try {
        acc.set(key, decodeURIComponent(value ?? ''));
      } catch (_error) {
        acc.set(key, value ?? '');
      }

      return acc;
    }, new Map<string, string>());
};

const getAccessToken = (c: AppContext): string | undefined => {
  const authorization = c.req.header('authorization');

  if (authorization?.toLowerCase().startsWith('bearer ')) {
    const token = authorization.slice(7).trim();

    if (token) {
      return token;
    }
  }

  const cookieHeader = c.req.header('cookie');
  const cookies = parseCookies(cookieHeader);

  const accessToken = cookies.get('sb-access-token');

  if (accessToken) {
    return accessToken;
  }

  const legacyToken = cookies.get('supabase-auth-token');

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

export const registerDashboardRoutes = (app: Hono<AppEnv>) => {
  app.get('/dashboard/overview', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const accessToken = getAccessToken(c);

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