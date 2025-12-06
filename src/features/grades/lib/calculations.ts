import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { match } from "ts-pattern";
import { SubmissionStatusSchema } from "@/features/grades/backend/schema";

type SubmissionStatus =
  (typeof SubmissionStatusSchema)["Enum"][keyof (typeof SubmissionStatusSchema)["Enum"]];

const DEFAULT_DATE_FORMAT = "PPP HH:mm";
const SCORE_FRACTION_DIGITS = 1;
const PERCENTAGE_FRACTION_DIGITS = 1;

const PENDING_STATUSES = new Set<SubmissionStatus>([
  SubmissionStatusSchema.Enum.submitted,
  SubmissionStatusSchema.Enum.resubmission_required,
]);

export const formatDateTime = (
  isoString: string | null | undefined,
  pattern = DEFAULT_DATE_FORMAT,
) => {
  if (!isoString) {
    return "-";
  }

  return format(parseISO(isoString), pattern, { locale: enUS });
};

export const formatScore = (score: number | null | undefined) => {
  if (score === null || score === undefined) {
    return "Not graded";
  }

  return `${score.toFixed(SCORE_FRACTION_DIGITS)} pts`;
};

export const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(PERCENTAGE_FRACTION_DIGITS)}%`;
};

export const getSubmissionStatusLabel = (status: SubmissionStatus) =>
  match(status)
    .with(SubmissionStatusSchema.Enum.graded, () => "Graded")
    .with(SubmissionStatusSchema.Enum.resubmission_required, () => "Resubmission requested")
    .otherwise(() => "Waiting for grading");

export const isPendingFeedbackStatus = (status: SubmissionStatus) =>
  PENDING_STATUSES.has(status);

export const buildLateLabel = (late: boolean) => (late ? "Late submission" : "On time");
