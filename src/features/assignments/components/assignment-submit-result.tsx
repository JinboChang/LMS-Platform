"use client";

import { Badge } from "@/components/ui/badge";
import {
  formatSubmissionTimestamp,
  resolveSubmissionBadge,
} from "@/features/assignments/lib/submission-status-helpers";
import type { AssignmentSubmissionResponse } from "@/features/assignments/lib/submission-dto";
import type { AssignmentSubmissionClientError } from "@/features/assignments/hooks/useSubmitAssignment";

type AssignmentSubmitResultProps = {
  result: AssignmentSubmissionResponse | null;
  error: AssignmentSubmissionClientError | null;
};

export const AssignmentSubmitResult = ({ result, error }: AssignmentSubmitResultProps) => {
  if (!result && !error) {
    return null;
  }

  if (result) {
    const badge = resolveSubmissionBadge(result.status, result.late);

    return (
      <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Submission completed</h3>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="text-sm text-emerald-800">{result.message}</p>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-emerald-700">
              Submitted at
            </dt>
            <dd className="font-medium">
              {formatSubmissionTimestamp(result.submittedAt)}
            </dd>
          </div>
          {result.isResubmission ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-emerald-700">
                Resubmission
              </dt>
              <dd className="font-medium">Resubmission recorded.</dd>
            </div>
          ) : null}
          {result.late ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-emerald-700">
                Late status
              </dt>
              <dd className="font-medium">Marked as a late submission.</dd>
            </div>
          ) : null}
        </dl>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
        <h3 className="text-base font-semibold">Submission failed</h3>
        <p className="text-sm text-rose-800">{error.message}</p>
        {error.code ? (
          <p className="text-xs text-rose-600">Error code · {error.code}</p>
        ) : null}
      </section>
    );
  }

  return null;
};
