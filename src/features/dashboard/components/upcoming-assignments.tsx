"use client";

import Link from "next/link";
import { AlarmClock, ArrowUpRight, CheckCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { UpcomingAssignmentViewModel } from "@/features/dashboard/lib/mappers";

const LoadingRow = () => (
  <li className="flex flex-col gap-3 rounded-lg border border-muted bg-card/40 p-4">
    <div className="h-5 w-2/3 animate-pulse rounded-md bg-muted" />
    <div className="flex flex-wrap items-center gap-3">
      <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
    </div>
  </li>
);

type UpcomingAssignmentsProps = {
  assignments: UpcomingAssignmentViewModel[];
  isLoading?: boolean;
};

export const UpcomingAssignments = ({
  assignments,
  isLoading = false,
}: UpcomingAssignmentsProps) => {
  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <AlarmClock className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold">Upcoming assignments</h2>
      </header>
      <Card className="border-muted p-4">
        <ul className="flex flex-col gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => <LoadingRow key={index} />)
            : assignments.length > 0
              ? assignments.map((assignment) => {
                  const href = `/courses/${assignment.courseId}/assignments/${assignment.id}`;

                  return (
                    <li key={assignment.id}>
                      <Link
                        href={href}
                        className="flex flex-col gap-3 rounded-lg border border-muted/60 bg-background/80 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`${assignment.courseTitle} · ${assignment.title} details`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              {assignment.courseTitle}
                            </p>
                            <p className="text-base font-semibold text-foreground">
                              {assignment.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" aria-hidden />
                            <span>{assignment.dueDateLabel}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-4 w-4" aria-hidden />
                          <span>{assignment.dueRelativeLabel}</span>
                          {assignment.lateSubmissionAllowed ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                              Late submission allowed
                            </span>
                          ) : null}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          View details
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  );
                })
              : (
                  <li className="rounded-lg border border-dashed border-muted/60 p-6 text-sm text-muted-foreground">
                    No upcoming deadlines within the next 48 hours.
                  </li>
                )}
        </ul>
      </Card>
    </section>
  );
};
