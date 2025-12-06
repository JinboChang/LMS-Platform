import { format, parseISO } from "date-fns";
import { match } from "ts-pattern";
import type { AssignmentSubmissionStatus } from "@/features/assignments/lib/submission-dto";

export type SubmissionBadgeVariant = "default" | "secondary" | "destructive" | "outline";

export type SubmissionBadgePresentation = {
  label: string;
  variant: SubmissionBadgeVariant;
};

export const formatSubmissionTimestamp = (value: string) => {
  try {
    const date = parseISO(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return format(date, "yyyy-MM-dd HH:mm");
  } catch (error) {
    return value;
  }
};

export const resolveSubmissionBadge = (
  status: AssignmentSubmissionStatus,
  late: boolean,
): SubmissionBadgePresentation =>
  match({ status, late })
    .with({ status: "graded" }, () => ({
      label: "Graded",
      variant: "secondary" as const,
    }))
    .with({ status: "resubmission_required" }, ({ late: isLate }) => ({
      label: isLate ? "Late resubmission requested" : "Resubmission requested",
      variant: "destructive" as const,
    }))
    .with({ status: "submitted", late: true }, () => ({
      label: "Submitted late",
      variant: "destructive" as const,
    }))
    .otherwise(() => ({
      label: "Submitted",
      variant: "default" as const,
    }));

export const buildSubmissionHeadline = (
  status: AssignmentSubmissionStatus,
  isResubmission: boolean,
) =>
  match({ status, isResubmission })
    .with({ status: "resubmission_required" }, () => "Resubmission required")
    .with({ status: "graded" }, () => "Grading completed")
    .with({ isResubmission: true }, () => "Resubmission received")
    .otherwise(() => "Submission received");
