"use client";

import { Button } from "@/components/ui/button";
import type { AssignmentStatus } from "@/features/instructor-assignments/lib/dto";

const statusLabels: Record<AssignmentStatus, string> = {
  draft: "Publish",
  published: "Close submissions",
  closed: "Closed",
};

const statusConfirmMessages: Partial<Record<AssignmentStatus, string>> = {
  published: "Publish this assignment so learners can view and submit?",
  closed: "Close submissions for this assignment?",
};

type AssignmentStatusToggleProps = {
  assignmentId: string;
  currentStatus: AssignmentStatus;
  allowedTransitions: readonly AssignmentStatus[];
  isUpdating?: boolean;
  onChange: (assignmentId: string, nextStatus: AssignmentStatus) => void;
};

export const AssignmentStatusToggle = ({
  assignmentId,
  currentStatus,
  allowedTransitions,
  isUpdating = false,
  onChange,
}: AssignmentStatusToggleProps) => {
  if (allowedTransitions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {currentStatus === "closed"
          ? "Assignment is closed."
          : "No additional status actions available."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowedTransitions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === "published" ? "default" : "outline"}
          disabled={isUpdating}
          onClick={() => {
            const confirmationMessage = statusConfirmMessages[status];

            if (confirmationMessage && !window.confirm(confirmationMessage)) {
              return;
            }

            onChange(assignmentId, status);
          }}
        >
          {isUpdating ? "Updating…" : statusLabels[status]}
        </Button>
      ))}
    </div>
  );
};
