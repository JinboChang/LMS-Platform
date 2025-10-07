"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InstructorDashboardRecentSubmissionItem } from "@/features/instructor-dashboard/lib/mappers";

const RECENT_DATE_FORMAT = "MMM d, yyyy p";

const formatSubmittedAt = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${format(date, RECENT_DATE_FORMAT)} · ${formatDistanceToNow(date, { addSuffix: true })}`;
};

type RecentSubmissionsProps = {
  items: InstructorDashboardRecentSubmissionItem[];
  isLoading?: boolean;
};

const LoadingTable = () => (
  <div className="flex min-h-[220px] flex-col gap-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="flex animate-pulse items-center gap-4 rounded-md border border-muted/60 p-4"
      >
        <div className="h-10 w-10 rounded-md bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
        <div className="h-6 w-16 rounded bg-muted" />
      </div>
    ))}
  </div>
);

export const RecentSubmissions = ({
  items,
  isLoading = false,
}: RecentSubmissionsProps) => (
  <Card className="h-full border-muted">
    <CardHeader>
      <CardTitle className="text-lg font-semibold">Recent submissions</CardTitle>
      <p className="text-sm text-muted-foreground">
        Latest activity across your courses for fast follow-up.
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      {isLoading ? (
        <LoadingTable />
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-muted/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No recent submissions in the last few days.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.submissionId}
              className="flex flex-col gap-2 rounded-lg border border-muted/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <Link
                  href={item.assignmentLink}
                  className="text-sm font-semibold text-foreground transition hover:text-primary"
                >
                  {item.assignmentTitle}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.courseTitle} · {item.learnerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSubmittedAt(item.submittedAt)}
                  {item.late ? " · Late submission" : ""}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm md:items-end">
                <Badge variant={item.badgeVariant}>{item.statusLabel}</Badge>
                <p className="text-xs text-muted-foreground">
                  Score: {item.score ?? "–"} {item.score !== null ? "/ 100" : ""}
                </p>
                {item.feedbackText ? (
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Feedback: {item.feedbackText}
                  </p>
                ) : null}
                {item.gradedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Graded {formatDistanceToNow(new Date(item.gradedAt), { addSuffix: true })}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);
