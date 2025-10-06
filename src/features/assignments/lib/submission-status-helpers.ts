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
      label: "채점 완료",
      variant: "secondary" as const,
    }))
    .with({ status: "resubmission_required" }, ({ late: isLate }) => ({
      label: isLate ? "지각 재제출 요청" : "재제출 요청",
      variant: "destructive" as const,
    }))
    .with({ status: "submitted", late: true }, () => ({
      label: "지각 제출",
      variant: "destructive" as const,
    }))
    .otherwise(() => ({
      label: "제출 완료",
      variant: "default" as const,
    }));

export const buildSubmissionHeadline = (
  status: AssignmentSubmissionStatus,
  isResubmission: boolean,
) =>
  match({ status, isResubmission })
    .with({ status: "resubmission_required" }, () => "재제출이 필요합니다")
    .with({ status: "graded" }, () => "채점이 완료되었습니다")
    .with({ isResubmission: true }, () => "재제출이 접수되었습니다")
    .otherwise(() => "제출이 접수되었습니다");
