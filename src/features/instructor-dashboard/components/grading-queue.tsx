"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InstructorDashboardGradingQueueItem } from "@/features/instructor-dashboard/lib/mappers";
import { INSTRUCTOR_DASHBOARD_PENDING_DISPLAY_LIMIT } from "@/features/instructor-dashboard/constants";

const LoadingState = () => (
  <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
    <p className="text-sm">Loading grading queue…</p>
  </div>
);

type GradingQueueProps = {
  items: InstructorDashboardGradingQueueItem[];
  isLoading?: boolean;
};

const formatSubmittedAt = (isoDate: string) =>
  formatDistanceToNow(new Date(isoDate), { addSuffix: true });

export const GradingQueue = ({ items, isLoading = false }: GradingQueueProps) => (
  <Card className="h-full border-muted">
    <CardHeader className="flex flex-row items-center justify-between">
      <div className="space-y-1">
        <CardTitle className="text-lg font-semibold">Grading queue</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review submissions that are waiting for your feedback.
        </p>
      </div>
      <Badge variant="outline" className="text-sm font-medium">
        {items.length}
      </Badge>
    </CardHeader>
    <CardContent className="space-y-4">
      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-muted/60 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5" aria-hidden />
          <p>No submissions require grading right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.submissionId} className="rounded-lg border border-muted/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {item.assignmentTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.courseTitle} · {item.learnerName}
                    </p>
                  </div>
                  <Badge variant={item.badgeVariant}>{item.statusLabel}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    Submitted {formatSubmittedAt(item.submittedAt)}
                    {item.late ? " · Late" : ""}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.assignmentLink}>Open submission</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Showing up to {INSTRUCTOR_DASHBOARD_PENDING_DISPLAY_LIMIT} items.
          </p>
        </div>
      )}
    </CardContent>
  </Card>
);
