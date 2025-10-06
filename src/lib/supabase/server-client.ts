import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/constants/env";
import type { Database } from "./types";

type WritableCookieStore = Awaited<ReturnType<typeof cookies>> & {
  set?: (options: {
    name: string;
    value: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  }) => void;
};

export const createSupabaseServerClient = async (): Promise<
  SupabaseClient<Database>
> => {
  const cookieStore = (await cookies()) as WritableCookieStore;

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (typeof cookieStore.set !== "function") {
              return;
            }

            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Next.js App Router에서는 서버 액션/라우트 핸들러 외부에서 쿠키를 수정할 수 없다.
              // 해당 환경에서는 세션 쿠키 갱신을 건너뛰고, 이후 라우트 핸들러에서 다시 설정된다.
              if (process.env.NODE_ENV !== "production") {
                console.warn("Skipping cookie set outside writable context", error);
              }
            }
          });
        },
      },
    }
  );
};
