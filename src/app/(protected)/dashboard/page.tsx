"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardEmptyState } from "@/features/dashboard/components/dashboard-empty-state";
import { DashboardSummary } from "@/features/dashboard/components/dashboard-summary";
import { CourseProgressGrid } from "@/features/dashboard/components/course-progress-grid";
import { UpcomingAssignments } from "@/features/dashboard/components/upcoming-assignments";
import { RecentFeedback } from "@/features/dashboard/components/recent-feedback";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview";

type DashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function DashboardPage({ params }: DashboardPageProps) {
  void params;
  const overviewQuery = useDashboardOverview();

  const courses = overviewQuery.data?.courses ?? [];
  const upcomingAssignments = overviewQuery.data?.upcomingAssignments ?? [];
  const recentFeedback = overviewQuery.data?.recentFeedback ?? [];

  const shouldShowEmptyState =
    overviewQuery.isSuccess && !overviewQuery.isFetching && courses.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Learner dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track course progress, upcoming deadlines, and instructor feedback from a single view.
        </p>
      </header>

      {overviewQuery.isError ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" aria-hidden />
            <span>
              {overviewQuery.error instanceof Error
                ? overviewQuery.error.message
                : "Failed to load dashboard data."}
            </span>
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => overviewQuery.refetch()}
              disabled={overviewQuery.isFetching}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {overviewQuery.isLoading ? (
        <div className="flex flex-col gap-8">
          <DashboardSummary isLoading />
          <CourseProgressGrid courses={[]} isLoading />
          <section className="grid gap-6 lg:grid-cols-2">
            <UpcomingAssignments assignments={[]} isLoading />
            <RecentFeedback feedbackItems={[]} isLoading />
          </section>
        </div>
      ) : shouldShowEmptyState ? (
        <DashboardEmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          <DashboardSummary summary={overviewQuery.data?.summary} />
          <CourseProgressGrid courses={courses} />
          <section className="grid gap-6 lg:grid-cols-2">
            <UpcomingAssignments assignments={upcomingAssignments} />
            <RecentFeedback feedbackItems={recentFeedback} />
          </section>
        </div>
      )}
    </div>
  );
}