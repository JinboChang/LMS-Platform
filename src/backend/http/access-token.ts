import type { AppContext } from '@/backend/hono/context';

const decodeCookieValue = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
};

const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  const pairs = cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((entry) => entry.split('='));

  const result = new Map<string, string>();

  for (const [key, ...rest] of pairs) {
    if (!key) {
      continue;
    }

    const rawValue = rest.join('=');
    result.set(key, decodeCookieValue(rawValue ?? ''));
  }

  return result;
};

const extractBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    return undefined;
  }

  const normalized = authorizationHeader.trim();

  if (!normalized.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = normalized.slice(7).trim();

  return token.length > 0 ? token : undefined;
};

const parseLegacySupabaseToken = (rawToken: string | undefined) => {
  if (!rawToken) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawToken) as { access_token?: string } | undefined;
    const token = parsed?.access_token;

    if (typeof token === 'string' && token.length > 0) {
      return token;
    }
  } catch (_error) {
    return undefined;
  }

  return undefined;
};

export const getAccessTokenFromContext = (c: AppContext) => {
  const headerToken = extractBearerToken(c.req.header('authorization'));

  if (headerToken) {
    return headerToken;
  }

  const cookies = parseCookies(c.req.header('cookie'));

  const supabaseAccessToken = cookies.get('sb-access-token');

  if (supabaseAccessToken) {
    return supabaseAccessToken;
  }

  const legacyToken = cookies.get('supabase-auth-token');

  if (!legacyToken) {
    return undefined;
  }

  return parseLegacySupabaseToken(legacyToken);
};
