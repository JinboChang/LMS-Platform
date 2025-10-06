"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GradesSummary } from "@/features/grades/components/grades-summary";
import { GradesEmptyState } from "@/features/grades/components/grades-empty-state";
import { CourseGradeTable } from "@/features/grades/components/course-grade-table";
import { useCourseGrades } from "@/features/grades/hooks/use-course-grades";
import { useGradesOverview } from "@/features/grades/hooks/use-grades-overview";
import {
  formatDateTime,
  formatPercentage,
} from "@/features/grades/lib/calculations";
import { cn } from "@/lib/utils";

type GradesPageProps = {
  params: Promise<Record<string, never>>;
};

export default function GradesPage({ params }: GradesPageProps) {
  void params;
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch,
  } = useGradesOverview();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!overview) {
      setSelectedCourseId(null);
      return;
    }

    if (overview.courses.length === 0) {
      setSelectedCourseId(null);
      return;
    }

    setSelectedCourseId((prev) => prev ?? overview.courses[0]?.courseId ?? null);
  }, [overview]);

  const {
    data: courseGrades,
    isLoading: courseLoading,
    error: courseError,
    refetch: refetchCourse,
  } = useCourseGrades(selectedCourseId);

  const selectedCourse = useMemo(
    () => overview?.courses.find((course) => course.courseId === selectedCourseId) ?? null,
    [overview, selectedCourseId],
  );

  const handleRetry = () => {
    void refetch();
    if (selectedCourseId) {
      void refetchCourse();
    }
  };

  if (overviewLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <p className="text-sm">성적 정보를 불러오는 중입니다.</p>
      </div>
    );
  }

  if (overviewError?.status === 401) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">성적을 확인하려면 온보딩이 필요합니다</h1>
          <p className="text-sm text-muted-foreground">
            {overviewError.message ?? "학습자 프로필을 완료한 뒤 다시 시도해 주세요."}
          </p>
        </div>
        <Button asChild>
          <Link href="/onboarding">온보딩 진행하기</Link>
        </Button>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">성적 정보를 불러올 수 없습니다</h1>
          <p className="text-sm text-muted-foreground">
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        </div>
        <Button onClick={handleRetry}>다시 시도</Button>
      </div>
    );
  }

  if (!overview || overview.courses.length === 0) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-semibold">성적 및 피드백</h1>
          <p className="text-sm text-muted-foreground">
            수강 중인 강좌의 성적과 피드백이 이곳에 모여 표시됩니다.
          </p>
        </header>
        <GradesEmptyState />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">성적 및 피드백</h1>
          <p className="text-sm text-muted-foreground">
            수강 중인 강좌의 성적과 피드백을 한눈에 확인하고, 최신 피드백을 놓치지 마세요.
          </p>
          <GradesSummary overview={overview} />
        </div>
        <Card className="overflow-hidden">
          <Image
            src="https://picsum.photos/seed/grades-hero/960/540"
            alt="학습 중인 학생"
            className="h-full w-full object-cover"
            width={960}
            height={540}
            priority
          />
        </Card>
      </header>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">강좌별 성적</h2>
          <p className="text-sm text-muted-foreground">
            아래에서 관심 있는 강좌를 선택하면 과제별 상세 점수와 피드백을 확인할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {overview.courses.map((course) => (
            <button
              key={course.courseId}
              type="button"
              onClick={() => setSelectedCourseId(course.courseId)}
              className={cn(
                "flex flex-col gap-2 rounded-lg border px-4 py-4 text-left transition hover:border-primary",
                selectedCourseId === course.courseId && "border-primary bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold">{course.courseTitle}</span>
                <span className="text-xs text-muted-foreground">
                  최근 피드백 {" "}
                  {course.latestFeedback
                    ? formatDateTime(course.latestFeedback.feedbackUpdatedAt)
                    : "없음"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>평균 {formatPercentage(course.weightedScore)}</span>
                <span>채점 완료 {course.gradedCount}건</span>
                <span>대기 {course.pendingFeedbackCount}건</span>
                <span>지연 {course.lateSubmissionCount}건</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">
            {selectedCourse?.courseTitle ?? "강좌를 선택해 주세요"}
          </h3>
          {courseError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <span>{courseError.message}</span>
              <Button variant="ghost" size="sm" onClick={() => void refetchCourse()}>
                다시 시도
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              과제별 점수, 비율, 제출 현황, 피드백 내용을 자세히 확인할 수 있습니다.
            </p>
          )}
        </div>
        {courseLoading ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/50 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            데이터를 불러오는 중입니다.
          </div>
        ) : courseGrades ? (
          <CourseGradeTable assignments={courseGrades.assignments} />
        ) : (
          <div className="rounded-md border border-dashed border-muted-foreground/50 px-4 py-6 text-sm text-muted-foreground">
            강좌를 선택하면 과제별 성적을 확인할 수 있습니다.
          </div>
        )}
      </section>
    </div>
  );
}