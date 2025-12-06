import type { Hono } from 'hono';
import {
  failure,
  respond,
  type ErrorResult,
} from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppContext,
  type AppEnv,
} from '@/backend/hono/context';
import {
  cancelEnrollment,
  enrollCourse,
  getCourseDetail,
  listCourses,
} from './service';
import {
  CourseParamsSchema,
  EnrollmentParamsSchema,
  EnrollmentRequestSchema,
  EnrollmentUpdateSchema,
} from './schema';
import {
  courseErrorCodes,
  enrollmentErrorCodes,
  type CourseServiceError,
  type EnrollmentServiceError,
} from './error';

type AccessTokenContext = {
  accessToken?: string;
};

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

const getAccessToken = (c: AppContext): AccessTokenContext => {
  const authorization = c.req.header('authorization');

  if (authorization?.toLowerCase().startsWith('bearer ')) {
    const token = authorization.slice(7).trim();

    if (token) {
      return { accessToken: token };
    }
  }

  const cookieHeader = c.req.header('cookie');
  const cookies = parseCookies(cookieHeader);

  const supabaseAccessToken = cookies.get('sb-access-token');

  if (supabaseAccessToken) {
    return { accessToken: supabaseAccessToken };
  }

  const legacyToken = cookies.get('supabase-auth-token');

  if (legacyToken) {
    try {
      const parsed = JSON.parse(legacyToken) as {
        access_token?: string;
      };

      if (typeof parsed.access_token === 'string') {
        return { accessToken: parsed.access_token };
      }
    } catch (_error) {
      return { accessToken: undefined };
    }
  }

  return { accessToken: undefined };
};

export const registerCourseRoutes = (app: Hono<AppEnv>) => {
  app.get('/courses', async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const query = c.req.query();
    const context = getAccessToken(c);
    const result = await listCourses(supabase, query, context);

    if (!result.ok) {
      const errorResult = result as ErrorResult<CourseServiceError, unknown>;

      if (errorResult.error.code === courseErrorCodes.fetchFailed) {
        logger.error('Failed to list courses', errorResult.error.details);
      }

      return respond(c, result);
    }

    return respond(c, result);
  });

  app.get('/courses/:id', async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const params = CourseParamsSchema.safeParse({ id: c.req.param('id') });

    if (!params.success) {
      return respond(
        c,
        failure(
          400,
          courseErrorCodes.invalidQuery,
          'A valid course ID is required.',
          params.error.format(),
        ),
      );
    }

    const context = getAccessToken(c);
    const result = await getCourseDetail(supabase, params.data.id, context);

    if (!result.ok) {
      const errorResult = result as ErrorResult<CourseServiceError, unknown>;

      if (errorResult.error.code === courseErrorCodes.fetchFailed) {
        logger.error('Failed to load course detail', errorResult.error.details);
      }

      return respond(c, result);
    }

    return respond(c, result);
  });

  app.post('/enrollments', async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const body = await c.req.json();
    const parsedBody = EnrollmentRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          enrollmentErrorCodes.invalidPayload,
          'Enrollment request is invalid.',
          parsedBody.error.format(),
        ),
      );
    }

    const context = getAccessToken(c);
    const result = await enrollCourse(supabase, parsedBody.data, context);

    if (!result.ok) {
      const errorResult = result as ErrorResult<EnrollmentServiceError, unknown>;

      if (
        errorResult.error.code ===
        enrollmentErrorCodes.enrollmentUpdateFailed
      ) {
        logger.error('Failed to enroll course', errorResult.error.details);
      }

      return respond(c, result);
    }

    return respond(c, result);
  });

  app.patch('/enrollments/:id', async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const params = EnrollmentParamsSchema.safeParse({ id: c.req.param('id') });

    if (!params.success) {
      return respond(
        c,
        failure(
          400,
          enrollmentErrorCodes.invalidPayload,
          'A valid enrollment ID is required.',
          params.error.format(),
        ),
      );
    }

    const body = await c.req.json();
    const parsedBody = EnrollmentUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          enrollmentErrorCodes.invalidPayload,
          'Enrollment cancellation request is invalid.',
          parsedBody.error.format(),
        ),
      );
    }

    const context = getAccessToken(c);
    const result = await cancelEnrollment(
      supabase,
      params.data.id,
      parsedBody.data,
      context,
    );

    if (!result.ok) {
      const errorResult = result as ErrorResult<EnrollmentServiceError, unknown>;

      if (
        errorResult.error.code ===
        enrollmentErrorCodes.enrollmentUpdateFailed
      ) {
        logger.error('Failed to cancel enrollment', errorResult.error.details);
      }

      return respond(c, result);
    }

    return respond(c, result);
  });
};
