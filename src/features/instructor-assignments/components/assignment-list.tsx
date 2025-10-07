"use client";

import { Calendar, ClipboardList, PencilLine } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssignmentStatusToggle } from "@/features/instructor-assignments/components/assignment-status-toggle";
import type { InstructorAssignmentListViewModel, InstructorAssignmentSummary } from "@/features/instructor-assignments/lib/mappers";

const statusOrder: InstructorAssignmentSummary["status"][] = [
  "draft",
  "published",
  "closed",
];

type AssignmentListProps = {
  assignments: InstructorAssignmentSummary[];
  statusCounts: InstructorAssignmentListViewModel["statusCounts"];
  onEdit: (assignment: InstructorAssignmentSummary) => void;
  onChangeStatus: (
    assignmentId: string,
    nextStatus: InstructorAssignmentSummary["status"],
  ) => void;
  isLoading?: boolean;
  updatingAssignmentId?: string | null;
};

const StatusSummary = ({
  statuses,
  counts,
}: {
  statuses: InstructorAssignmentSummary["status"][];
  counts: InstructorAssignmentListViewModel["statusCounts"];
}) => (
  <div className="grid gap-4 md:grid-cols-3">
    {statuses.map((status) => (
      <Card key={status} className="border-muted">
        <CardContent className="flex flex-col gap-2 p-4">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {status}
          </span>
          <span className="text-2xl font-semibold">
            {counts[status].toLocaleString()}
          </span>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const AssignmentList = ({
  assignments,
  statusCounts,
  onEdit,
  onChangeStatus,
  isLoading = false,
  updatingAssignmentId = null,
}: AssignmentListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-muted">
            <div className="flex animate-pulse flex-col gap-4 p-6">
              <div className="h-5 w-1/3 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="space-y-3 p-6 text-center">
          <CardTitle className="text-2xl">No assignments yet</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create your first assignment to start collecting learner submissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <StatusSummary statuses={statusOrder} counts={statusCounts} />

      <div className="grid gap-6">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="border-muted">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">
                      {assignment.title}
                    </CardTitle>
                    <Badge variant={assignment.statusBadgeVariant}>
                      {assignment.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {assignment.statusDescription}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {assignment.dueDateLabel}
                    </span>
                    <span>•</span>
                    <span>{assignment.dueDateRelativeLabel}</span>
                    <span>•</span>
                    <span>{assignment.scoreWeight}% weight</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(assignment)}
                  className="inline-flex items-center gap-2"
                >
                  <PencilLine className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <h4 className="mb-1 text-sm font-medium text-foreground">Instructions</h4>
                  <p>{assignment.instructions}</p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-medium text-foreground">
                    Submission requirements
                  </h4>
                  <p>{assignment.submissionRequirements}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-muted p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <ClipboardList className="h-4 w-4" />
                    Submissions
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <dt className="font-medium text-foreground">Total</dt>
                      <dd>{assignment.submissionStats.total}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Pending</dt>
                      <dd>{assignment.submissionStats.pending}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Graded</dt>
                      <dd>{assignment.submissionStats.graded}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Late</dt>
                      <dd>{assignment.submissionStats.late}</dd>
                    </div>
                  </dl>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Status actions</h4>
                  <AssignmentStatusToggle
                    assignmentId={assignment.id}
                    currentStatus={assignment.status}
                    allowedTransitions={assignment.allowedTransitions}
                    onChange={onChangeStatus}
                    isUpdating={updatingAssignmentId === assignment.id}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
