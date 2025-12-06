"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatDueDateTime,
  formatDueRelative,
} from "@/features/assignments/lib/status-helpers";
import type { AssignmentDto } from "@/features/assignments/lib/dto";
import { cn } from "@/lib/utils";

type AssignmentDetailPanelProps = {
  assignment: AssignmentDto;
  isLate: boolean;
};

const formatScoreWeight = (scoreWeight: number) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: scoreWeight % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });

  return formatter.format(scoreWeight / 100);
};

export const AssignmentDetailPanel = ({
  assignment,
  isLate,
}: AssignmentDetailPanelProps) => {
  const statusTone = cn(
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
    assignment.status === "closed"
      ? "bg-rose-500/10 text-rose-400"
      : "bg-emerald-500/10 text-emerald-300",
  );

  return (
    <Card className="border-slate-200">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={statusTone}>
            {assignment.status === "closed" ? "Submission closed" : "In progress"}
          </Badge>
          {assignment.lateSubmissionAllowed ? (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
              Late submission allowed
            </Badge>
          ) : null}
          {isLate ? (
            <Badge variant="destructive" className="bg-rose-500/10 text-rose-500">
              Past due
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-2xl font-semibold text-slate-900">
          {assignment.title}
        </CardTitle>
        <dl className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Due at
            </dt>
            <dd className="font-medium text-slate-800">
              {formatDueDateTime(assignment.dueAt)}
            </dd>
            <dd className="text-xs text-slate-500">
              {formatDueRelative(assignment.dueAt)} remaining
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Score weight
            </dt>
            <dd className="font-medium text-slate-800">
              {formatScoreWeight(assignment.scoreWeight)}
            </dd>
            <dd className="text-xs text-slate-500">
              Weight toward course total
            </dd>
          </div>
        </dl>
      </CardHeader>
      <CardContent className="space-y-6 text-sm text-slate-700">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">Assignment description</h2>
          <p className="leading-relaxed text-slate-700">{assignment.description}</p>
        </section>
        <Separator />
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">Submission guide</h2>
          <p className="leading-relaxed text-slate-700">{assignment.instructions}</p>
        </section>
        <Separator />
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">Submission requirements</h2>
          {assignment.submissionRequirements
            .split(/\n+/)
            .filter(Boolean)
            .map((line, index) => (
              <p
                key={`assignment-requirement-${index}`}
                className="leading-relaxed text-slate-700"
              >
                {line}
              </p>
            ))}
        </section>
      </CardContent>
    </Card>
  );
};
