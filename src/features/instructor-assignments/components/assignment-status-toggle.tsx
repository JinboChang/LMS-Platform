"use client";

import { Button } from "@/components/ui/button";
import type { AssignmentStatus } from "@/features/instructor-assignments/lib/dto";

const actionLabels: Record<AssignmentStatus, string> = {
  draft: "Publish",
  published: "Close submissions",
  closed: "Closed",
};

type AssignmentStatusToggleProps = {
  assignmentId: string;
  currentStatus: AssignmentStatus;
  allowedTransitions: readonly AssignmentStatus[];
  isUpdating?: boolean;
  onSelect: (assignmentId: string, nextStatus: AssignmentStatus) => void;
};

export const AssignmentStatusToggle = ({
  assignmentId,
  currentStatus,
  allowedTransitions,
  isUpdating = false,
  onSelect,
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
            if (!isUpdating) {
              onSelect(assignmentId, status);
            }
          }}
        >
          {isUpdating ? "Updating…" : actionLabels[status]}
        </Button>
      ))}
    </div>
  );
};
