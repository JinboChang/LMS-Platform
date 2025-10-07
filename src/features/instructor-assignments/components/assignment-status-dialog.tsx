"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Info, Lock } from "lucide-react";
import { match } from "ts-pattern";
import { Button } from "@/components/ui/button";
import type { AssignmentStatus } from "@/features/instructor-assignments/lib/dto";
import type { InstructorAssignmentSummary } from "@/features/instructor-assignments/lib/mappers";

type AssignmentStatusDialogProps = {
  open: boolean;
  assignment: InstructorAssignmentSummary | null;
  targetStatus: AssignmentStatus | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isProcessing?: boolean;
};

const dialogOverlayClassName =
  "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out";

const dialogContentClassName =
  "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95";

const publishChecklist = (assignment: InstructorAssignmentSummary) => {
  const checks = [
    {
      label: "Title",
      valid: assignment.title.trim().length > 0,
    },
    {
      label: "Description",
      valid: assignment.description.trim().length > 0,
    },
    {
      label: "Due date",
      valid: assignment.dueAt.trim().length > 0,
    },
    {
      label: "Score weight",
      valid: Number.isFinite(assignment.scoreWeight),
    },
    {
      label: "Instructions",
      valid: assignment.instructions.trim().length > 0,
    },
    {
      label: "Submission requirements",
      valid: assignment.submissionRequirements.trim().length > 0,
    },
    {
      label: "Late submission policy",
      valid: typeof assignment.lateSubmissionAllowed === "boolean",
    },
  ];

  return {
    checklist: checks,
    isReady: checks.every((item) => item.valid),
  };
};

const buildDialogCopy = (
  targetStatus: AssignmentStatus,
  assignment: InstructorAssignmentSummary
) =>
  match(targetStatus)
    .with("published", () => {
      const { checklist, isReady } = publishChecklist(assignment);

      return {
        title: "Publish assignment",
        description:
          "Publishing makes this assignment visible to learners and opens submissions.",
        checklist,
        isReady,
        icon: <Info className="h-5 w-5 text-primary" aria-hidden />,
        primaryActionLabel: "Publish assignment",
      };
    })
    .with("closed", () => ({
      title: "Close submissions",
      description:
        "Closing an assignment prevents additional submissions while keeping existing work available for grading.",
      checklist: [],
      isReady: true,
      icon: <Lock className="h-5 w-5 text-primary" aria-hidden />,
      primaryActionLabel: "Close submissions",
    }))
    .otherwise(() => ({
      title: "Update assignment status",
      description: "Confirm the assignment status change.",
      checklist: [],
      isReady: true,
      icon: <Info className="h-5 w-5 text-primary" aria-hidden />,
      primaryActionLabel: "Confirm",
    }));

export const AssignmentStatusDialog = ({
  open,
  assignment,
  targetStatus,
  onClose,
  onConfirm,
  isProcessing = false,
}: AssignmentStatusDialogProps) => {
  if (!assignment || !targetStatus) {
    return null;
  }

  const copy = buildDialogCopy(targetStatus, assignment);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={dialogOverlayClassName} />
        <DialogPrimitive.Content className={dialogContentClassName}>
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-primary/10 p-2">{copy.icon}</span>
            <div className="space-y-2">
              <DialogPrimitive.Title className="text-lg font-semibold">
                {copy.title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {copy.description}
              </DialogPrimitive.Description>
            </div>
          </div>

          {copy.checklist.length > 0 && (
            <div className="mt-6 space-y-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Required before publishing
              </p>
              <ul className="space-y-2 text-sm">
                {copy.checklist.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                    data-valid={item.valid}
                  >
                    <span>{item.label}</span>
                    <span
                      className={item.valid ? "text-xs text-primary" : "text-xs text-destructive"}
                    >
                      {item.valid ? "Ready" : "Missing"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <DialogPrimitive.Close asChild>
              <Button variant="outline" type="button" disabled={isProcessing}>
                Cancel
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              onClick={() => {
                if (copy.isReady && !isProcessing) {
                  void onConfirm();
                }
              }}
              disabled={!copy.isReady || isProcessing}
            >
              {isProcessing ? "Processing…" : copy.primaryActionLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
