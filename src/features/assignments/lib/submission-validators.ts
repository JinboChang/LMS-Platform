import { z } from "zod";

export const MIN_SUBMISSION_TEXT_LENGTH = 20;

const optionalUrlSchema = z
  .string()
  .trim()
  .url({ message: "유효한 URL을 입력해주세요." })
  .optional()
  .or(
    z
      .literal("")
      .transform(() => undefined),
  );

export const AssignmentSubmissionFormSchema = z.object({
  submissionText: z
    .string()
    .trim()
    .min(MIN_SUBMISSION_TEXT_LENGTH, {
      message: `제출 본문은 최소 ${MIN_SUBMISSION_TEXT_LENGTH}자 이상 작성해주세요.`,
    }),
  submissionLink: optionalUrlSchema,
});

export type AssignmentSubmissionFormValues = z.infer<
  typeof AssignmentSubmissionFormSchema
>;

export const buildDefaultSubmissionValues = (
  initial?: Partial<AssignmentSubmissionFormValues>,
): AssignmentSubmissionFormValues => ({
  submissionText: initial?.submissionText ?? "",
  submissionLink: initial?.submissionLink ?? undefined,
});
