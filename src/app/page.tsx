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
  Layers,
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
    title: "학습 관리의 시작, 맞춤형 대시보드",
    description:
      "오늘 학습해야 할 콘텐츠, 지난 학습 기록, 남은 과제를 한 화면에서 확인하세요.",
    action: "대시보드 미리 보기",
    href: "/dashboard",
    icon: <Rocket className="h-6 w-6 text-sky-300" />,
  },
  {
    title: "교수자를 위한 강의 제작 스튜디오",
    description:
      "강의 개설부터 과제 배포, 채점까지 단계별 안내와 자동화 도구가 함께합니다.",
    action: "강의 스튜디오 가기",
    href: "/instructor/courses",
    icon: <GraduationCap className="h-6 w-6 text-indigo-300" />,
  },
  {
    title: "운영팀을 위한 신고·지원 센터",
    description:
      "학습자 문의와 신고가 들어오면 SLA에 맞춰 자동으로 우선순위를 지정해 드립니다.",
    action: "운영 콘솔 열기",
    href: "/operator",
    icon: <Shield className="h-6 w-6 text-emerald-300" />,
  },
];

const steps: StepCard[] = [
  {
    step: "01",
    heading: "회원가입하고 역할 선택하기",
    detail:
      "학습자·교수자·운영자 중 나에게 맞는 역할을 선택하면 첫 화면이 달라집니다.",
  },
  {
    step: "02",
    heading: "맞춤형 대시보드 살펴보기",
    detail:
      "오늘 해야 할 일, 놓치고 있던 과제, 최근 알림을 한눈에 확인해 보세요.",
  },
  {
    step: "03",
    heading: "콘텐츠와 과제로 성장 이어가기",
    detail:
      "강의, 라이브 세션, 과제를 통해 학습을 이어가고, 피드백을 즉시 받아보세요.",
  },
];

const learnerBenefits: BenefitCard[] = [
  {
    title: "나만을 위한 학습 체크리스트",
    body: "로그인하면 오늘 해야 할 일과 다음 마감일이 자동으로 정리됩니다.",
  },
  {
    title: "성장 그래프와 목표 달성률",
    body: "진행률·점수·피드백을 그래프로 보여 주어 나의 속도를 점검할 수 있어요.",
    metric: "진행률 달성도 80% 이상 학습자 비율 ↑",
  },
  {
    title: "실시간 질문과 소통 지원",
    body: "라이브 힌트, 토론, 신고 기능으로 언제든 도움을 요청할 수 있습니다.",
  },
];

const stories: StoryCard[] = [
  {
    quote:
      "오늘 해야 할 일이 대시보드에 정리돼 있어서 마음이 편해졌어요. 과제도 제때 제출하게 됐습니다.",
    name: "박소연",
    role: "직장인 학습자",
  },
  {
    quote:
      "강의 자료와 과제 흐름을 한 번에 만들 수 있어 수업 준비 시간이 많이 줄었어요.",
    name: "김도윤",
    role: "교수자",
  },
  {
    quote:
      "문의와 신고가 들어오면 우선순위가 자동으로 정리돼 운영팀이 더 빠르게 대응하고 있습니다.",
    name: "정민재",
    role: "운영 리더",
  },
];

const gettingReady: ShowcaseCard[] = [
  {
    title: "빠른 온보딩 가이드",
    description:
      "처음 방문했다면 온보딩 체크리스트에서 필수 기능을 순서대로 안내받으세요.",
    action: "온보딩 시작",
    href: "/onboarding",
    icon: <Compass className="h-6 w-6 text-slate-200" />,
  },
  {
    title: "커리큘럼 둘러보기",
    description:
      "강의, 워크숍, 과제 일정이 어떻게 구성돼 있는지 미리 확인할 수 있어요.",
    action: "강의 목록 보기",
    href: "/courses",
    icon: <BookOpen className="h-6 w-6 text-slate-200" />,
  },
  {
    title: "학습 여정 카드 소개",
    description:
      "진행률, 히스토리, 추천 콘텐츠 등 학습 여정을 추적하는 카드를 살펴보세요.",
    action: "대시보드 살펴보기",
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
            여러분의 학습 플랫폼
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
          강의 둘러보기
        </Link>
        <Link
          href="/example"
          className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/70"
        >
          기능 미리 보기
        </Link>
        {isLoading ? (
          <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-400">
            로그인 상태 확인 중...
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
              나의 대시보드
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-900 transition hover:bg-slate-50"
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/70"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-4 py-1 font-medium text-slate-950 shadow-lg shadow-sky-400/40 transition hover:from-indigo-400 hover:via-sky-400 hover:to-emerald-300"
            >
              무료로 시작하기
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
          당신의 학습이 한 곳에서 시작되는 곳
        </span>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-100 sm:text-5xl lg:text-[3.3rem]">
            오늘 해야 할 일과
            <span className="ml-2 inline bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
              나만의 성장 경로
            </span>
            를 한 번에 보세요.
          </h1>
          <p className="text-lg text-slate-300">
            이 플랫폼은 학습자에게는 명확한 체크리스트를, 교수자에게는 쉽고 빠른 강의 구성 도구를,
            운영팀에게는 안정적인 지원 시스템을 제공합니다.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href={isAuthenticated ? "/dashboard" : "/signup"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 px-6 py-3 text-base font-medium text-slate-950 shadow-xl shadow-blue-500/30 transition hover:from-indigo-400 hover:via-blue-400 hover:to-cyan-300"
          >
            {isAuthenticated ? "대시보드 열기" : "무료 체험 시작"}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-6 py-3 text-base text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/70"
          >
            강의 목록 보기
          </Link>
        </div>
        <div className="flex flex-col gap-4 text-sm text-slate-400 sm:flex-row">
          <BadgeLine icon={CheckCircle2} label="오늘 할 일과 마감일을 자동으로 정리" />
          <BadgeLine icon={CheckCircle2} label="참여도와 피드백을 시각화한 성장 지도" />
          <BadgeLine icon={CheckCircle2} label="문의·신고에 빠르게 대응하는 운영 팀" />
        </div>
      </div>
      <div className="relative rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-[0_20px_80px_-40px_rgba(56,189,248,0.6)]">
        <div className="absolute -top-16 right-6 h-36 w-36 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-6 left-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              오늘의 추천
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-100">
              “이번 주 과제 마감까지 3일 남았어요. 과제 작성 팁과 예시를 확인해 보세요.”
            </p>
            <p className="mt-2 text-sm text-slate-300">
              추천 콘텐츠, 진행 중인 강의, 받은 피드백이 한 화면에서 연결됩니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MiniCard
              icon={<Workflow className="h-5 w-5 text-sky-300" />}
              title="오늘의 학습"
              description="강의 보기 → 노트 정리 → 퀴즈 참여 순서대로 안내합니다."
            />
            <MiniCard
              icon={<Users className="h-5 w-5 text-indigo-300" />}
              title="실시간 도움"
              description="질문, 토론, 신고 기능으로 바로 도움을 요청하세요."
            />
            <MiniCard
              icon={<Heart className="h-5 w-5 text-rose-300" />}
              title="맞춤 피드백"
              description="강사 피드백과 동료 피드백이 타임라인으로 모입니다."
            />
            <MiniCard
              icon={<Users className="h-5 w-5 text-emerald-300" />}
              title="목표 달성률"
              description="중단 위험 학습자에게는 리마인더와 대체 학습을 제안합니다."
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
      <h2 className="text-3xl font-semibold text-slate-100">어떤 경험을 만나게 되나요?</h2>
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
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">시작은 이렇게</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-100">
            처음 방문한 학습자를 위한 3단계 가이드
          </h2>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:bg-slate-900/70"
        >
          온보딩 체크리스트 보기
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
      <h2 className="text-3xl font-semibold text-slate-100">학습자가 좋아하는 이유</h2>
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
          플랫폼을 사용해 본 사람들의 이야기
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {stories.map((story) => (
          <figure
            key={story.name}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <blockquote className="text-lg leading-relaxed text-slate-200">
              “{story.quote}”
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
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">지금 바로</p>
          <h2 className="text-3xl font-semibold text-slate-100">
            필요한 화면으로 바로 이동하세요
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
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">READY TO LEARN</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-100">
            여러분의 학습 여정, 지금 여기에서 시작하세요
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            필요한 콘텐츠를 빠르게 찾고, 과제와 피드백을 놓치지 않고, 운영팀의 지원까지 받을 수 있는 공간입니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 px-6 py-3 font-medium text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:from-indigo-400 hover:via-sky-400 hover:to-emerald-300"
          >
            지금 가입하고 둘러보기
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-600 px-6 py-3 text-slate-200 transition hover:border-slate-400 hover:bg-slate-900/70"
          >
            운영팀에게 문의하기
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
