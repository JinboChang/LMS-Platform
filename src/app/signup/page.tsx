"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { onboardingRoles } from "@/features/onboarding/lib/dto";

const defaultFormState = {
  email: "",
  password: "",
  confirmPassword: "",
};

type SignupPageProps = {
  params: Promise<Record<string, never>>;
};

const isRoleValue = (
  value: unknown
): value is (typeof onboardingRoles)[number] =>
  typeof value === "string" && onboardingRoles.includes(value as never);

export default function SignupPage({ params }: SignupPageProps) {
  void params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh, isAuthenticated, user } = useCurrentUser();
  const resolvedRole = useMemo(() => {
    const rawRole = user?.userMetadata?.role ?? user?.appMetadata?.role;

    return isRoleValue(rawRole) ? rawRole : null;
  }, [user?.appMetadata?.role, user?.userMetadata?.role]);
  const [formState, setFormState] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const redirectedFrom = searchParams.get("redirectedFrom");
    const defaultPath = resolvedRole === "instructor" ? "/instructor/dashboard" : "/courses";
    const shouldUseRedirectedFrom = redirectedFrom && redirectedFrom !== "/" && redirectedFrom !== "";
    const targetPath = shouldUseRedirectedFrom ? redirectedFrom : defaultPath;

    if (!resolvedRole) {
      const fallback = shouldUseRedirectedFrom ? redirectedFrom : defaultPath;
      router.replace(
        `/onboarding?redirectedFrom=${encodeURIComponent(fallback)}`
      );
      return;
    }

    router.replace(targetPath);
  }, [isAuthenticated, resolvedRole, router, searchParams]);

  const isSubmitDisabled = useMemo(
    () =>
      !formState.email.trim() ||
      !formState.password.trim() ||
      formState.password !== formState.confirmPassword,
    [formState.confirmPassword, formState.email, formState.password]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFormState((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);

      if (formState.password !== formState.confirmPassword) {
        setErrorMessage("Password confirmation does not match.");
        setIsSubmitting(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();

      try {
        const result = await supabase.auth.signUp({
          email: formState.email,
          password: formState.password,
        });

        if (result.error) {
          setErrorMessage(result.error.message ?? "Unable to sign up.");
          setIsSubmitting(false);
          return;
        }

        await refresh();

        const redirectedFrom = searchParams.get("redirectedFrom") ?? "/";
        const onboardingPath = `/onboarding?redirectedFrom=${encodeURIComponent(
          redirectedFrom
        )}`;

        if (result.data.session) {
          router.replace(onboardingPath);
          return;
        }

        setInfoMessage(
          "Check your email to confirm your account, then continue to onboarding."
        );
        router.prefetch("/login");
        router.prefetch(onboardingPath);
        setFormState(defaultFormState);
      } catch (error) {
        setErrorMessage("Unable to sign up. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formState.confirmPassword,
      formState.email,
      formState.password,
      refresh,
      router,
      searchParams,
    ]
  );

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">Create an account</h1>
        <p className="text-slate-500">
          Sign up with Supabase and finish onboarding to start learning.
        </p>
      </header>
      <div className="grid w-full gap-8 md:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formState.email}
              onChange={handleChange}
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={formState.password}
              onChange={handleChange}
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Confirm password
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={formState.confirmPassword}
              onChange={handleChange}
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </label>
          {errorMessage ? (
            <p className="text-sm text-rose-500">{errorMessage}</p>
          ) : null}
          {infoMessage ? (
            <p className="text-sm text-emerald-600">{infoMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting || isSubmitDisabled}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-slate-700 underline hover:text-slate-900"
            >
              Log in
            </Link>
          </p>
        </form>
        <figure className="overflow-hidden rounded-xl border border-slate-200">
          <Image
            src="https://picsum.photos/seed/signup/640/640"
            alt="Signup illustration"
            width={640}
            height={640}
            className="h-full w-full object-cover"
            priority
          />
        </figure>
      </div>
    </div>
  );
}
