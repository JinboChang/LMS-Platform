"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  onboardingRoles,
  type OnboardingResponse,
} from "@/features/onboarding/lib/dto";

const heroImageUrl = "https://picsum.photos/seed/onboarding/960/960";

const isRoleValue = (
  value: unknown
): value is (typeof onboardingRoles)[number] =>
  typeof value === "string" && onboardingRoles.includes(value as never);

type OnboardingPageProps = {
  params: Promise<Record<string, never>>;
};

export default function OnboardingPage({ params }: OnboardingPageProps) {
  void params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, refresh } = useCurrentUser();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const resolvedRole = useMemo(() => {
    const rawRole = user?.userMetadata?.role ?? user?.appMetadata?.role;

    return isRoleValue(rawRole) ? rawRole : null;
  }, [user?.appMetadata?.role, user?.userMetadata?.role]);

  useEffect(() => {
    if (status === "authenticated" && resolvedRole && !isRedirecting) {
      const nextPath = resolvedRole === "learner" ? "/courses" : "/instructor/dashboard";
      setIsRedirecting(true);
      router.replace(nextPath);
    }
  }, [isRedirecting, resolvedRole, router, status]);

  const handleCompleted = useCallback(
    async (response: OnboardingResponse) => {
      setIsRedirecting(true);
      await refresh();
      const redirectedFrom = searchParams.get("redirectedFrom");
      const fallback = response.redirectPath;
      const shouldUseRedirectedFrom =
        redirectedFrom && redirectedFrom !== "/" && redirectedFrom !== "";
      const targetPath = shouldUseRedirectedFrom ? redirectedFrom : fallback;

      router.replace(targetPath);
    },
    [refresh, router, searchParams]
  );

  if (isRedirecting) {
    return null;
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <section className="space-y-6">
        <header className="space-y-4">
          <p className="text-sm font-medium text-slate-500">Onboarding basics</p>
          <h1 className="text-4xl font-semibold text-slate-900 md:text-5xl">
            Choose your role and tailor your learning space
          </h1>
          <p className="text-base text-slate-600">
            Tell us a little about your goals so we can send you to the right dashboard and guides without any extra setup.
          </p>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
          <OnboardingForm
            defaultEmail={user?.email ?? null}
            onCompleted={handleCompleted}
          />
        </div>
      </section>
      <aside className="hidden md:block">
        <figure className="overflow-hidden rounded-3xl border border-slate-200 shadow-lg">
          <Image
            src={heroImageUrl}
            alt="Onboarding illustration"
            width={960}
            height={960}
            className="h-full w-full object-cover"
            priority
          />
        </figure>
      </aside>
    </div>
  );
}
