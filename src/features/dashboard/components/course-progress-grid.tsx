"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CourseViewModel } from "@/features/dashboard/lib/mappers";

const LoadingCard = () => (
  <Card className="border-muted">
    <div className="flex h-full animate-pulse flex-col gap-4 p-6">
      <div className="h-32 w-full rounded-lg bg-muted" />
      <div className="space-y-2">
        <div className="h-6 w-2/3 rounded-md bg-muted" />
        <div className="h-4 w-1/2 rounded-md bg-muted" />
      </div>
      <div className="h-2 w-full rounded-full bg-muted" />
    </div>
  </Card>
);

type CourseProgressGridProps = {
  courses: CourseViewModel[];
  isLoading?: boolean;
};

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 w-full rounded-full bg-muted" aria-hidden>
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-full rounded-full bg-primary transition-all"
      style={{ width: `${value}%` }}
    />
  </div>
);

export const CourseProgressGrid = ({
  courses,
  isLoading = false,
}: CourseProgressGridProps) => {
  if (isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingCard key={index} />
        ))}
      </section>
    );
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/courses/${course.id}`}
          className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${course.title} details`}
        >
          <Card className="flex h-full flex-col border-muted transition group-hover:border-primary/50 group-hover:shadow-md">
            <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
              <Image
                src={course.coverImageUrl}
                alt={`${course.title} course cover`}
                fill
                sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <CardHeader className="gap-2">
              <CardTitle className="text-lg font-semibold transition group-hover:text-primary">
                {course.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {`${course.completionSummary} assignments complete`}
              </p>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{course.progressLabel}</span>
              </div>
              <ProgressBar value={course.progressPercentage} />
              {course.nextDueDateLabel ? (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Next due</p>
                  <p className="text-muted-foreground">
                    {course.nextDueDateLabel}
                    {course.nextDueRelativeLabel ? ` (${course.nextDueRelativeLabel})` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No scheduled deadlines.</p>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                View course details
                <span aria-hidden>→</span>
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
};
