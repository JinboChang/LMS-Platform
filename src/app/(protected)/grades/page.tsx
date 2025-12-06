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
        <p className="text-sm">Loading your grades...</p>
      </div>
    );
  }

  if (overviewError?.status === 401) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Please complete onboarding to view grades</h1>
          <p className="text-sm text-muted-foreground">
            {overviewError.message ?? "Finish onboarding to access your grade dashboard."}
          </p>
        </div>
        <Button asChild>
          <Link href="/onboarding">Start onboarding</Link>
        </Button>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Unable to load grades</h1>
          <p className="text-sm text-muted-foreground">
            A temporary error occurred. Please try again.
          </p>
        </div>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    );
  }

  if (!overview || overview.courses.length === 0) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-semibold">Grade board</h1>
          <p className="text-sm text-muted-foreground">
            Grade records for your active courses will appear here.
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
          <h1 className="text-3xl font-semibold">Grade board</h1>
          <p className="text-sm text-muted-foreground">
            Review weighted scores, submission status, and feedback for each active course.
          </p>
          <GradesSummary overview={overview} />
        </div>
        <Card className="overflow-hidden">
          <Image
            src="https://picsum.photos/seed/grades-hero/960/540"
            alt="Student studying"
            className="h-full w-full object-cover"
            width={960}
            height={540}
            priority
          />
        </Card>
      </header>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Grades by course</h2>
          <p className="text-sm text-muted-foreground">
            Choose a course to review assignment scores, weights, and feedback.
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
                  Latest feedback{" "}
                  {course.latestFeedback
                    ? formatDateTime(course.latestFeedback.feedbackUpdatedAt)
                    : "None yet"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>Weighted score {formatPercentage(course.weightedScore)}</span>
                <span>Graded {course.gradedCount}</span>
                <span>Pending {course.pendingFeedbackCount}</span>
                <span>Late {course.lateSubmissionCount}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">
            {selectedCourse?.courseTitle ?? "Select a course to view details"}
          </h3>
          {courseError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <span>{courseError.message}</span>
              <Button variant="ghost" size="sm" onClick={() => void refetchCourse()}>
                Retry
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              View assignment scores, weights, submission status, and detailed feedback.
            </p>
          )}
        </div>
        {courseLoading ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/50 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading course details...
          </div>
        ) : courseGrades ? (
          <CourseGradeTable assignments={courseGrades.assignments} />
        ) : (
          <div className="rounded-md border border-dashed border-muted-foreground/50 px-4 py-6 text-sm text-muted-foreground">
            Select a course to see grade details.
          </div>
        )}
      </section>
    </div>
  );
}
