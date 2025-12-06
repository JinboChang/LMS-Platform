"use client";

import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AssignmentGrade } from "@/features/grades/lib/dto";
import {
  buildLateLabel,
  formatDateTime,
  formatPercentage,
  formatScore,
  getSubmissionStatusLabel,
} from "@/features/grades/lib/calculations";

const INFO_CLASS = "flex flex-col gap-1 rounded-md border px-4 py-3";

type FeedbackDetailDialogProps = {
  assignment: AssignmentGrade;
  children: ReactNode;
};

export const FeedbackDetailDialog = ({ assignment, children }: FeedbackDetailDialogProps) => (
  <Sheet>
    <SheetTrigger asChild>{children}</SheetTrigger>
    <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
      <SheetHeader className="gap-4 text-left">
        <div className="flex items-center justify-between gap-2">
          <SheetTitle>{assignment.title}</SheetTitle>
          <Badge>
            {getSubmissionStatusLabel(assignment.submissionStatus)}
          </Badge>
        </div>
        <SheetDescription>
          {assignment.feedbackText ?? "Detailed feedback is not available yet."}
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 flex flex-col gap-3">
        <div className={INFO_CLASS}>
          <span className="text-xs text-muted-foreground">Score</span>
          <span className="text-base font-semibold text-foreground">
            {formatScore(assignment.score)}
          </span>
        </div>
        <div className={INFO_CLASS}>
          <span className="text-xs text-muted-foreground">Weight</span>
          <span className="text-base font-medium text-foreground">
            {formatPercentage(assignment.scoreWeight)}
          </span>
        </div>
        <div className={INFO_CLASS}>
          <span className="text-xs text-muted-foreground">Submitted at</span>
          <span className="text-sm text-foreground">
            {formatDateTime(assignment.submittedAt)}
          </span>
        </div>
        <div className={INFO_CLASS}>
          <span className="text-xs text-muted-foreground">Graded at</span>
          <span className="text-sm text-foreground">
            {formatDateTime(assignment.gradedAt)}
          </span>
        </div>
        <div className={INFO_CLASS}>
          <span className="text-xs text-muted-foreground">Late</span>
          <span className="text-sm text-foreground">
            {buildLateLabel(assignment.late)}
          </span>
        </div>
        <div className={INFO_CLASS}>
          <span className="text-xs text-muted-foreground">Feedback updated</span>
          <span className="text-sm text-foreground">
            {formatDateTime(assignment.feedbackUpdatedAt)}
          </span>
        </div>
      </div>
    </SheetContent>
  </Sheet>
);
