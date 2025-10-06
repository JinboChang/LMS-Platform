"use client";

import { Badge } from "@/components/ui/badge";
import {
  buildSubmissionHeadline,
  formatSubmissionTimestamp,
  resolveSubmissionBadge,
} from "@/features/assignments/lib/submission-status-helpers";
import {
  formatDueDateTime,
  formatDueRelative,
} from "@/features/assignments/lib/status-helpers";
import type { AssignmentSubmissionStatus } from "@/features/assignments/lib/submission-dto";

export type SubmissionSnapshot = {
  status: AssignmentSubmissionStatus;
  late: boolean;
  submittedAt: string;
  isResubmission: boolean;
  message?: string;
  previousStatus?: AssignmentSubmissionStatus | null;
};

type AssignmentSubmitStatusProps = {
  assignmentTitle: string;
  dueAt: string;
  lateSubmissionAllowed: boolean;
  canSubmit: boolean;
  snapshot: SubmissionSnapshot | null;
};

export const AssignmentSubmitStatus = ({
  assignmentTitle,
  dueAt,
  lateSubmissionAllowed,
  canSubmit,
  snapshot,
}: AssignmentSubmitStatusProps) => {
  const badge = snapshot
    ? resolveSubmissionBadge(snapshot.status, snapshot.late)
    : { label: "제출 기록 없음", variant: "outline" as const };

  const headline = snapshot
    ? buildSubmissionHeadline(snapshot.status, snapshot.isResubmission)
    : "아직 제출된 기록이 없습니다";

  const submissionMessage = snapshot?.message;
  const submittedAt = snapshot ? formatSubmissionTimestamp(snapshot.submittedAt) : null;

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {assignmentTitle}
        </p>
        <h2 className="text-xl font-semibold text-slate-900">제출 현황</h2>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {!canSubmit ? (
          <Badge variant="destructive" className="bg-rose-500/10 text-rose-500">
            제출 불가
          </Badge>
        ) : null}
        {lateSubmissionAllowed ? (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
            지각 제출 허용
          </Badge>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">마감 정보</h3>
        <dl className="space-y-2 text-sm text-slate-700">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">마감 일시</dt>
            <dd className="font-medium text-slate-900">{formatDueDateTime(dueAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">남은 시간</dt>
            <dd className="text-slate-600">{formatDueRelative(dueAt)}</dd>
          </div>
        </dl>
      </div>

      <article className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">{headline}</h3>
        {submissionMessage ? (
          <p className="text-sm text-slate-600">{submissionMessage}</p>
        ) : null}
        {submittedAt ? (
          <p className="text-xs text-slate-500">제출 시각 · {submittedAt}</p>
        ) : null}
        {snapshot?.late ? (
          <p className="text-xs font-medium text-amber-600">
            이번 제출은 지각으로 기록됩니다.
          </p>
        ) : null}
      </article>
    </section>
  );
};
