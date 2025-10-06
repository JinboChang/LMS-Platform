"use client";

import { MessageSquare, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { RecentFeedbackViewModel } from "@/features/dashboard/lib/mappers";

type RecentFeedbackProps = {
  feedbackItems: RecentFeedbackViewModel[];
  isLoading?: boolean;
};

const LoadingFeedback = () => (
  <li className="space-y-2 rounded-lg border border-muted bg-card/40 p-4">
    <div className="h-5 w-1/2 animate-pulse rounded-md bg-muted" />
    <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
    <div className="h-3 w-full animate-pulse rounded-md bg-muted" />
  </li>
);

export const RecentFeedback = ({
  feedbackItems,
  isLoading = false,
}: RecentFeedbackProps) => {
  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold">Recent feedback</h2>
      </header>
      <Card className="border-muted p-4">
        <ul className="flex flex-col gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => <LoadingFeedback key={index} />)
            : feedbackItems.length > 0
              ? feedbackItems.map((item) => (
                  <li key={item.submissionId} className="space-y-2 rounded-lg border border-muted/60 bg-background/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {item.courseTitle}
                        </p>
                        <p className="text-base font-semibold">{item.assignmentTitle}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.feedbackTimeLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {item.score !== null ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          <Star className="h-4 w-4" aria-hidden />
                          {item.score}
                        </span>
                      ) : null}
                      <span>{item.feedbackText ?? "Feedback pending."}</span>
                    </div>
                  </li>
                ))
              : (
                  <li className="rounded-lg border border-dashed border-muted/60 p-6 text-sm text-muted-foreground">
                    You have not received any feedback yet.
                  </li>
                )}
        </ul>
      </Card>
    </section>
  );
};