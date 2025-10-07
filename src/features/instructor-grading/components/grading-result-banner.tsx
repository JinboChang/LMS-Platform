"use client";

import { Badge } from "@/components/ui/badge";
import type { SubmissionDetailViewModel } from "@/features/instructor-grading/lib/mappers";

const formatScore = (score: number | null) => {
  if (score === null) {
    return 'Not graded yet';
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(score);
};

type GradingResultBannerProps = {
  submission: SubmissionDetailViewModel | null;
};

export const GradingResultBanner = ({ submission }: GradingResultBannerProps) => {
  if (!submission) {
    return null;
  }

  return (
    <div className="rounded-lg border border-muted bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {submission.statusLabel}
            </h2>
            <Badge variant={submission.statusBadgeVariant}>{submission.statusLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{submission.statusDescription}</p>
        </div>
        <dl className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <dt className="font-medium text-foreground">Score</dt>
            <dd>{formatScore(submission.score)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="font-medium text-foreground">Updated</dt>
            <dd>{submission.gradedAtLabel ?? submission.submittedAtLabel}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Submitted {submission.submittedAtRelative}
      </div>
    </div>
  );
};
