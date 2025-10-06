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
          <h3 className="text-base font-semibold">제출이 완료되었습니다</h3>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="text-sm text-emerald-800">{result.message}</p>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-emerald-700">
              제출 시각
            </dt>
            <dd className="font-medium">
              {formatSubmissionTimestamp(result.submittedAt)}
            </dd>
          </div>
          {result.isResubmission ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-emerald-700">
                재제출 여부
              </dt>
              <dd className="font-medium">재제출 처리되었습니다.</dd>
            </div>
          ) : null}
          {result.late ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-emerald-700">
                지각 상태
              </dt>
              <dd className="font-medium">지각 제출로 기록됩니다.</dd>
            </div>
          ) : null}
        </dl>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
        <h3 className="text-base font-semibold">제출에 실패했습니다</h3>
        <p className="text-sm text-rose-800">{error.message}</p>
        {error.code ? (
          <p className="text-xs text-rose-600">오류 코드 · {error.code}</p>
        ) : null}
      </section>
    );
  }

  return null;
};
