"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  Heart,
  LineChart,
  Rocket,
  Shield,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

type ShowcaseCard = {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: React.ReactNode;
};

type StepCard = {
  step: string;
  heading: string;
  detail: string;
};

type BenefitCard = {
  title: string;
  body: string;
  metric?: string;
};

type StoryCard = {
  quote: string;
  name: string;
  role: string;
};

const showcaseCards: ShowcaseCard[] = [
  {
    title: "Stay ahead with a focused dashboard",
    description:
      "See today's required content, assignment history, and the next actions you should take to stay on track.",
    action: "Preview dashboard",
    href: "/dashboard",
    icon: <Rocket className="h-6 w-6 text-sky-300" />,
  },
  {
    title: "Instructor studio for building courses",
    description:
      "Design your outline, publish assignments, grade quickly, and keep everything organized in one place.",
    action: "Open course studio",
    href: "/instructor/courses",
    icon: <GraduationCap className="h-6 w-6 text-indigo-300" />,
  },
  {
    title: "Operations hub with alerts and SLAs",
    description:
      "Triage questions and incidents with guided workflows so you never miss a response target or service level.",
    action: "Open operator console",
    href: "/operator",
    icon: <Shield className="h-6 w-6 text-emerald-300" />,
  },
];

const steps: StepCard[] = [
  {
    step: "01",
    heading: "Choose your role and finish onboarding",
    detail:
      "Pick learner, instructor, or operator so we can tailor the setup and routes for you.",
  },
  {
    step: "02",
    heading: "Review what's waiting for you",
    detail:
      "See today's required lessons, open assignments, and recent updates at a glance.",
  },
  {
    step: "03",
    heading: "Plan courses and assignments together",
    detail:
      "Build courses, sessions, and assignments as one flow so progress stays clear for everyone.",
  },
];

const learnerBenefits: BenefitCard[] = [
  {
    title: "Clear progress tracking",
    body: "Log in to see all courses, remaining tasks, and deadlines update in real time.",
  },
  {
    title: "Goals that stay on schedule",
    body: "Progress, grades, and feedback show the next best action to keep you moving.",
    metric: "Cohorts report 80%+ completion when tracked here",
  },
  {
    title: "Connected questions and support",
    body: "Chat, Q&A, and notifications help you get answers fast without leaving the page.",
  },
];

const stories: StoryCard[] = [
  {
    quote:
      "The daily checklist keeps me on time, and assignments are organized so I never wonder what to do next.",
    name: "Soo Park",
    role: "Learner",
  },
  {
    quote:
      "Building courses and tracking submissions take minutes now, freeing up hours for teaching.",
    name: "Hyun Kim",
    role: "Instructor",
  },
  {
    quote:
      "Our support inbox finally runs on clear timelines, and SLAs are easy to hit with guided workflows.",
    name: "Mina Choi",
    role: "Operations Lead",
  },
];

const gettingReady: ShowcaseCard[] = [
  {
    title: "Fast onboarding guide",
    description:
      "Follow the onboarding checklist and you can finish setup in minutes without extra meetings.",
    action: "Start onboarding",
    href: "/onboarding",
    icon: <Compass className="h-6 w-6 text-slate-200" />,
  },
  {
    title: "Browse the curriculum",
    description:
      "Explore courses, tracks, and assignments to see what you'll learn before you enroll.",
    action: "View courses",
    href: "/courses",
    icon: <BookOpen className="h-6 w-6 text-slate-200" />,
  },
  {
    title: "Personalized progress cards",
    description:
      "See progress, recommendations, and tasks in one place so you can start right away.",
    action: "View my dashboard",
    href: "/dashboard",
    icon: <LineChart className="h-6 w-6 text-slate-200" />,
  },
];

export default function Home() {
  const { user, isAuthenticated, isLoading, refresh } = useCurrentUser();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    await refresh();
    router.replace("/");
  }, [refresh, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <AmbientBackground />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-24 pt-10 sm:px-12 lg:px-16">
        <Header
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          email={user?.email ?? ""}
          onSignOut={handleSignOut}
        />
        <Hero isAuthenticated={isAuthenticated} />
        <HighlightDeck />
        <StepSection />
        <LearnerBenefitSection />
        <StorySection />
        <PreparationSection />
        <CtaSection />
      </div>
    </main>
  );
}

function Header({
  isAuthenticated,
  isLoading,
  email,
  onSignOut,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 text-xl font-semibold text-slate-950 shadow-lg shadow-sky-500/30">
          LMS
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-100">
            Your learning workspace
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            learn · connect · grow
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/courses"
          className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/70"
        >
          Browse courses
        </Link>
        <Link
          href="/example"
          className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/70"
        >
          View example
        </Link>
        {isLoading ? (
          <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-400">
            Checking login...
          </span>
        ) : isAuthenticated ? (
          <>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-200">
              {email}
            </span>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-full border border-slate-600 px-3 py-1 text-slate-100 transition hover:border-slate-400 hover:bg-slate-900/60"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-900 transition hover:bg-slate-50"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/70"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-4 py-1 font-medium text-slate-950 shadow-lg shadow-sky-400/40 transition hover:from-indigo-400 hover:via-sky-400 hover:to-emerald-300"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          New paths for every learner, instructor, and operator
        </span>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-100 sm:text-5xl lg:text-[3.3rem]">
            Build courses, ship assignments,
            <span className="ml-2 inline bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
              and grow together
            </span>
            — starting today
          </h1>
          <p className="text-lg text-slate-300">
            Learners get a clear checklist, instructors get streamlined course creation, and operators keep service on time. Everyone knows what to do next without digging through different tools.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href={isAuthenticated ? "/dashboard" : "/signup"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 px-6 py-3 text-base font-medium text-slate-950 shadow-xl shadow-blue-500/30 transition hover:from-indigo-400 hover:via-blue-400 hover:to-cyan-300"
          >
            {isAuthenticated ? "Open dashboard" : "Start for free"}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-6 py-3 text-base text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/70"
          >
            Explore courses
          </Link>
        </div>
        <div className="flex flex-col gap-4 text-sm text-slate-400 sm:flex-row">
          <BadgeLine icon={CheckCircle2} label="Automatic tracking for assignments and progress" />
          <BadgeLine icon={CheckCircle2} label="Personalized paths for every learner" />
          <BadgeLine icon={CheckCircle2} label="Faster responses for questions and alerts" />
        </div>
      </div>
      <div className="relative rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-[0_20px_80px_-40px_rgba(56,189,248,0.6)]">
        <div className="absolute -top-16 right-6 h-36 w-36 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-6 left-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Today's highlight
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-100">
              Three assignments are due this week. Check requirements and start now so you can submit early.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Recommended content is already queued; new lessons and updates will appear here as soon as they arrive.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MiniCard
              icon={<Workflow className="h-5 w-5 text-sky-300" />}
              title="Active learning"
              description="Manage your course list and assignments without leaving this card view."
            />
            <MiniCard
              icon={<Users className="h-5 w-5 text-indigo-300" />}
              title="Team collaboration"
              description="Ask questions, reply, and share updates right where you learn."
            />
            <MiniCard
              icon={<Heart className="h-5 w-5 text-rose-300" />}
              title="Matched feedback"
              description="Instructors and peers respond quickly so you can iterate with confidence."
            />
            <MiniCard
              icon={<Users className="h-5 w-5 text-emerald-300" />}
              title="Goal alignment"
              description="Review milestones with your mentor and keep every step visible."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HighlightDeck() {
  return (
    <section className="mt-24 space-y-8">
      <h2 className="text-3xl font-semibold text-slate-100">Everything you need in one place</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {showcaseCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group flex h-full flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-indigo-400/60 hover:shadow-xl hover:shadow-indigo-500/20"
          >
            <div className="flex items-center gap-3 text-slate-200">
              {card.icon}
              <h3 className="text-lg font-semibold">{card.title}</h3>
            </div>
            <p className="mt-4 flex-1 text-sm text-slate-400">{card.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-indigo-300">
              {card.action}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StepSection() {
  return (
    <section className="mt-24 rounded-3xl border border-slate-800 bg-slate-900/60 px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-100">
            Three steps to set up your learning space
          </h2>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:bg-slate-900/70"
        >
          View onboarding checklist
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.step}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_20px_60px_-40px_rgba(56,189,248,0.4)]"
          >
            <span className="text-xs font-semibold text-sky-300">STEP {step.step}</span>
            <h3 className="mt-3 text-lg font-semibold text-slate-100">{step.heading}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LearnerBenefitSection() {
  return (
    <section className="mt-24 space-y-6">
      <h2 className="text-3xl font-semibold text-slate-100">Learners love these benefits</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {learnerBenefits.map((benefit) => (
          <div
            key={benefit.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <h3 className="text-lg font-semibold text-slate-100">{benefit.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{benefit.body}</p>
            {benefit.metric ? (
              <span className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-300">
                <Heart className="h-4 w-4" />
                {benefit.metric}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function StorySection() {
  return (
    <section className="mt-24 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-3xl font-semibold text-slate-100">
          Teams using it to learn and ship together
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {stories.map((story) => (
          <figure
            key={story.name}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <blockquote className="text-lg leading-relaxed text-slate-200">
              {story.quote}
            </blockquote>
            <figcaption className="mt-4 text-sm text-slate-400">
              <span className="font-medium text-slate-200">{story.name}</span>
              <span className="mx-1 text-slate-600">·</span>
              {story.role}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function PreparationSection() {
  return (
    <section className="mt-24 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Get started now</p>
          <h2 className="text-3xl font-semibold text-slate-100">
            Pick where you want to go next
          </h2>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {gettingReady.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group flex h-full flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-indigo-400/60 hover:shadow-xl hover:shadow-indigo-500/20"
          >
            <div className="flex items-center gap-3 text-slate-200">
              {card.icon}
              <h3 className="text-lg font-semibold">{card.title}</h3>
            </div>
            <p className="mt-4 flex-1 text-sm text-slate-300">{card.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-indigo-300">
              {card.action}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="mt-24 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-10 shadow-[0_0_120px_-40px_rgba(56,189,248,0.4)]">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Ready to learn</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-100">
            Your learning plan starts here
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Find the content you need fast, keep assignments organized, and get support from setup to shipping. Join and see everything in one place.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 px-6 py-3 font-medium text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:from-indigo-400 hover:via-sky-400 hover:to-emerald-300"
          >
            Create an account
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-600 px-6 py-3 text-slate-200 transition hover:border-slate-400 hover:bg-slate-900/70"
          >
            Contact support
          </Link>
        </div>
      </div>
    </section>
  );
}

function BadgeLine({
  icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  const Icon = icon;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
      <Icon className="h-3.5 w-3.5 text-sky-300" />
      {label}
    </div>
  );
}

function MiniCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {icon}
      <p className="mt-2 text-sm font-semibold text-slate-100">{title}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/30 via-sky-500/20 to-transparent blur-3xl" />
      <div className="absolute bottom-10 left-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute bottom-24 right-1/5 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_transparent_55%)]" />
    </div>
  );
}
