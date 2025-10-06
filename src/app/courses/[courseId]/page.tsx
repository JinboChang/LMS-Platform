"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCourseDetail } from "@/features/courses/hooks/useCourseDetail";
import { useEnrollmentMutation } from "@/features/courses/hooks/useEnrollmentMutation";
import { useEnrollmentGuard } from "@/features/courses/hooks/useEnrollmentGuard";
import { useEnrollmentToast } from "@/features/courses/components/enrollment-toast";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

const containerClass = "mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10";

const SkeletonSection = () => (
  <div className="space-y-4">
    <div className="h-9 w-1/2 animate-pulse rounded-md bg-slate-200" />
    <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-200" />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded-md bg-slate-200" />
        <div className="h-32 w-full animate-pulse rounded-md bg-slate-200" />
        <div className="h-48 w-full animate-pulse rounded-md bg-slate-200" />
      </div>
      <div className="space-y-4">
        <div className="h-40 w-full animate-pulse rounded-md bg-slate-200" />
        <div className="h-12 w-full animate-pulse rounded-md bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded-md bg-slate-200" />
      </div>
    </div>
  </div>
);

type ErrorStateProps = {
  title: string;
  description: string;
  onRetry?: () => void;
  onBack?: () => void;
};

const ErrorState = ({ title, description, onRetry, onBack }: ErrorStateProps) => (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
    <div className="flex gap-2">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
          뒤로 가기
        </Button>
      ) : null}
      {onRetry ? (
        <Button type="button" onClick={onRetry}>
          다시 시도
        </Button>
      ) : null}
    </div>
  </div>
);

type PageParams = {
  courseId: string;
};

type CourseDetailPageProps = {
  params: Promise<PageParams>;
};

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status: authStatus, isAuthenticated } = useCurrentUser();
  const guard = useEnrollmentGuard();
  const { enrollMutation, cancelMutation } = useEnrollmentMutation();
  const { showEnrollSuccess, showCancelSuccess, showError } = useEnrollmentToast();

  const [resolvedParams, setResolvedParams] = useState<PageParams | null>(null);
  const [paramError, setParamError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    params
      .then((value) => {
        if (active) {
          setResolvedParams(value);
        }
      })
      .catch(() => {
        if (active) {
          setParamError("요청 경로를 해석하지 못했습니다.");
        }
      });

    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!isAuthenticated && authStatus !== "loading") {
      const redirect = pathname
        ? `?redirectedFrom=${encodeURIComponent(pathname)}`
        : "";
      router.replace(`/login${redirect}`);
    }
  }, [authStatus, isAuthenticated, pathname, router]);

  const courseId = resolvedParams?.courseId ?? null;
  const courseQuery = useCourseDetail(courseId);

  const retry = () => {
    courseQuery.refetch();
  };

  const handleAction = async (
    courseId: string,
    enrollmentId: string | null,
    isEnrolled: boolean,
    courseTitle: string,
  ) => {
    try {
      if (isEnrolled && enrollmentId) {
        await cancelMutation.mutateAsync({ enrollmentId, courseId });
        showCancelSuccess(courseTitle);
        courseQuery.refetch();
        return;
      }

      if (!guard.ensure()) {
        return;
      }

      await enrollMutation.mutateAsync({ courseId });
      showEnrollSuccess(courseTitle);
      courseQuery.refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : "요청 처리에 실패했습니다.");
    }
  };

  if (paramError) {
    return (
      <div className={containerClass}>
        <ErrorState
          title="잘못된 요청"
          description={paramError}
          onBack={() => router.back()}
        />
      </div>
    );
  }

  if (!courseId || courseQuery.status === "pending") {
    return (
      <div className={containerClass}>
        <SkeletonSection />
      </div>
    );
  }

  if (courseQuery.status === "error") {
    return (
      <div className={containerClass}>
        <ErrorState
          title="코스 정보를 불러오지 못했습니다"
          description={
            courseQuery.error instanceof Error
              ? courseQuery.error.message
              : "잠시 후 다시 시도해주세요."
          }
          onRetry={retry}
        />
      </div>
    );
  }

  const course = courseQuery.data;
  const enrollmentId = course.enrollment?.id ?? null;
  const isEnrolled = course.enrollmentStatus === "active" && Boolean(enrollmentId);

  const actionLabel = isEnrolled
    ? cancelMutation.isPending
      ? "수강 취소 중..."
      : "수강 취소"
    : enrollMutation.isPending
      ? "수강 신청 중..."
      : "수강 신청";

  const actionDisabled =
    enrollMutation.isPending ||
    cancelMutation.isPending ||
    (!isEnrolled && (!guard.canEnroll || guard.isLoading));

  return (
    <div className={containerClass}>
      <header className="space-y-3">
        <span className="text-xs font-semibold uppercase text-slate-400">
          Course Detail
        </span>
        <h1 className="text-4xl font-semibold text-slate-900">{course.title}</h1>
        <p className="text-sm text-slate-500">
          {course.category.name} · {course.difficulty.label}
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <article className="space-y-8">
          <div className="relative h-64 w-full overflow-hidden rounded-2xl">
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
            />
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">코스 소개</h2>
            <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>
          </section>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">커리큘럼</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="whitespace-pre-line">{course.curriculum}</p>
            </div>
          </section>
        </article>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">코스 정보</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span>
                  {course.activeEnrollmentCount.toLocaleString()}명의 학습자가 수강 중입니다.
                </span>
              </p>
              <p className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-slate-400" />
                <span>{course.instructor.name}</span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>
                  {isEnrolled
                    ? "이미 수강 중인 코스입니다."
                    : "지금 바로 수강 신청이 가능합니다."}
                </span>
              </p>
            </div>

            {!guard.isAuthenticated ? (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                로그인이 필요한 기능입니다.
              </p>
            ) : null}

            {guard.isAuthenticated && !guard.isLearner ? (
              <p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-600">
                학습자 역할로만 수강 신청을 진행할 수 있습니다.
              </p>
            ) : null}

            <Button
              className="mt-4 w-full"
              variant={isEnrolled ? "outline" : "default"}
              disabled={actionDisabled}
              onClick={() =>
                handleAction(course.id, enrollmentId, isEnrolled, course.title)
              }
            >
              {actionLabel}
            </Button>
          </section>
        </aside>
      </section>
    </div>
  );
}
