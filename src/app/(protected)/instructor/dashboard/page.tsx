"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseStatusSummary } from "@/features/instructor-dashboard/components/course-status-summary";
import { GradingQueue } from "@/features/instructor-dashboard/components/grading-queue";
import { InstructorDashboardEmptyState } from "@/features/instructor-dashboard/components/empty-state";
import { RecentSubmissions } from "@/features/instructor-dashboard/components/recent-submissions";
import {
  INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS,
  INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER,
} from "@/features/instructor-dashboard/constants";
import { useInstructorDashboard } from "@/features/instructor-dashboard/hooks/useInstructorDashboard";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

const HERO_IMAGE_SEED = "instructor-dashboard-hero";
const LEARNER_DASHBOARD_PATH = "/dashboard";
const INSTRUCTOR_ONBOARDING_PATH = "/onboarding";

type InstructorDashboardPageProps = {
  params: Promise<Record<string, never>>;
};

const buildHeroImageUrl = () => {
  const { width, height } = INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS;
  return `${INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER}/seed/${HERO_IMAGE_SEED}/${width}/${height}`;
};

const extractUserRole = (metadata: Record<string, unknown> | undefined | null) => {
  const role = metadata && typeof metadata.role === "string" ? metadata.role : null;
  return role;
};

export default function InstructorDashboardPage({
  params,
}: InstructorDashboardPageProps) {
  void params;
  const { user } = useCurrentUser();
  const role = extractUserRole(user?.userMetadata);
  const dashboardQuery = useInstructorDashboard();

  if (role && role !== "instructor") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Instructor access required</h1>
          <p className="text-sm text-muted-foreground">
            This area is reserved for instructors. Switch to the learner dashboard to continue, or complete instructor onboarding.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link href={LEARNER_DASHBOARD_PATH}>Go to learner dashboard</Link>
          </Button>
          <Button asChild>
            <Link href={INSTRUCTOR_ONBOARDING_PATH}>Start instructor onboarding</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = dashboardQuery.isLoading;
  const hasData = Boolean(dashboardQuery.data);
  const totalCourses = dashboardQuery.data?.totalCourseCount ?? 0;
  const pendingCount = dashboardQuery.data?.pendingGrading.length ?? 0;
  const recentCount = dashboardQuery.data?.recentSubmissions.length ?? 0;
  const courseBuckets = dashboardQuery.data?.courseBuckets ?? [];

  if (!isLoading && dashboardQuery.isError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Failed to load dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : "Please try again in a moment."}
          </p>
        </div>
        <Button onClick={() => void dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}>
          Retry
        </Button>
      </div>
    );
  }

  if (!isLoading && hasData && totalCourses === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-4">
            <p className="text-sm font-medium text-primary">Instructor workspace</p>
            <h1 className="text-3xl font-semibold">Launch your first learning experience</h1>
            <p className="text-sm text-muted-foreground">
              Publish a course to begin accepting learners. You can manage assignments, track submissions, and send feedback once your first course is live.
            </p>
          </div>
          <Card className="overflow-hidden">
            <Image
              src={buildHeroImageUrl()}
              alt="Instructor dashboard overview"
              className="h-full w-full object-cover"
              width={INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS.width}
              height={INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS.height}
              priority
            />
          </Card>
        </header>
        <InstructorDashboardEmptyState />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Instructor workspace</p>
            <h1 className="text-3xl font-semibold">Instructor dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Monitor the health of your courses, keep pace with grading, and follow the latest learner submissions.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-muted/60 bg-muted/20 p-4 text-sm">
              <p className="text-muted-foreground">Active courses</p>
              <p className="text-2xl font-semibold">{totalCourses}</p>
            </div>
            <div className="rounded-lg border border-muted/60 bg-muted/20 p-4 text-sm">
              <p className="text-muted-foreground">Pending grading</p>
              <p className="text-2xl font-semibold">{pendingCount}</p>
            </div>
            <div className="rounded-lg border border-muted/60 bg-muted/20 p-4 text-sm">
              <p className="text-muted-foreground">Recent submissions</p>
              <p className="text-2xl font-semibold">{recentCount}</p>
            </div>
          </div>
        </div>
        <Card className="overflow-hidden">
          <Image
            src={buildHeroImageUrl()}
            alt="Instructor reviewing submissions"
            className="h-full w-full object-cover"
            width={INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS.width}
            height={INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS.height}
            priority
          />
        </Card>
      </header>

      <CourseStatusSummary buckets={courseBuckets} isLoading={isLoading} />

      <section className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
        <GradingQueue items={dashboardQuery.data?.pendingGrading ?? []} isLoading={isLoading} />
        <RecentSubmissions items={dashboardQuery.data?.recentSubmissions ?? []} isLoading={isLoading} />
      </section>
    </div>
  );
}
