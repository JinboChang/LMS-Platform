"use client";

import type { AxiosRequestConfig } from "axios";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const extractTokenFromStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const keys = Object.keys(window.localStorage ?? {});

    for (const key of keys) {
      if (!/^sb-.*-auth-token$/.test(key)) {
        continue;
      }

      const raw = window.localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw) as
        | { access_token?: string; currentSession?: { access_token?: string } }
        | undefined;

      const directToken = parsed?.access_token;
      const sessionToken = parsed?.currentSession?.access_token;

      if (typeof directToken === "string" && directToken.length > 0) {
        return directToken;
      }

      if (typeof sessionToken === "string" && sessionToken.length > 0) {
        return sessionToken;
      }
    }
  } catch (_error) {
    // ignore and fall through
  }

  return null;
};

const resolveAccessToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const sessionToken = data.session?.access_token;

  if (sessionToken) {
    return sessionToken;
  }

  return extractTokenFromStorage();
};

export const createAuthRequestConfig = async (): Promise<
  Pick<AxiosRequestConfig, "headers" | "withCredentials">
> => {
  const token = await resolveAccessToken();

  if (!token) {
    return {
      withCredentials: true,
    } satisfies Pick<AxiosRequestConfig, "headers" | "withCredentials">;
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  } as const;
};