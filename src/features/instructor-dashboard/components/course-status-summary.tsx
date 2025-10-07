"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InstructorDashboardCourseBucket } from "@/features/instructor-dashboard/lib/mappers";

const COURSE_PREVIEW_LIMIT = 3;
const COURSE_EDIT_ROUTE_BASE = "/instructor/courses";

const LoadingCard = () => (
  <Card className="border-muted">
    <div className="flex h-full animate-pulse flex-col gap-4 p-6">
      <div className="h-6 w-32 rounded-md bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: COURSE_PREVIEW_LIMIT }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-md bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

type CourseStatusSummaryProps = {
  buckets: InstructorDashboardCourseBucket[];
  isLoading?: boolean;
};

const formatRelativeUpdatedAt = (isoDate: string) =>
  formatDistanceToNow(new Date(isoDate), { addSuffix: true });

export const CourseStatusSummary = ({
  buckets,
  isLoading = false,
}: CourseStatusSummaryProps) => {
  if (isLoading) {
    return (
      <section className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingCard key={index} />
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      {buckets.map((bucket) => {
        const previewCourses = bucket.courses.slice(0, COURSE_PREVIEW_LIMIT);

        return (
          <Card key={bucket.status} className="relative flex h-full flex-col border-muted">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center justify-between text-lg font-semibold">
                <span>{bucket.label}</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {bucket.count}
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{bucket.description}</p>
            </CardHeader>
            <CardContent className="mt-auto space-y-4">
              {previewCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courses in this status yet.
                </p>
              ) : (
                <ul className="space-y-4">
                  {previewCourses.map((course) => (
                    <li key={course.id}>
                      <Link
                        href={`${COURSE_EDIT_ROUTE_BASE}/${course.id}/edit`}
                        className="group flex items-center gap-3 rounded-md border border-transparent p-2 transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={course.coverImageUrl}
                            alt={`${course.title} cover`}
                            fill
                            sizes="48px"
                            className="object-cover transition group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-5 text-foreground">
                            {course.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {course.assignmentCount} assignments · {course.pendingGradingCount} pending
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Updated {formatRelativeUpdatedAt(course.updatedAt)}
                          </p>
                        </div>
                        <span className="text-lg text-muted-foreground transition group-hover:text-primary" aria-hidden>
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {bucket.count > previewCourses.length ? (
                <p className="text-xs text-muted-foreground">
                  {bucket.count - previewCourses.length} more course{bucket.count - previewCourses.length === 1 ? '' : 's'} in this status.
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
};
