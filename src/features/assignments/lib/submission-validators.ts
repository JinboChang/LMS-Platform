import { z } from "zod";

export const MIN_SUBMISSION_TEXT_LENGTH = 20;

const optionalUrlSchema = z
  .string()
  .trim()
  .url({ message: "Please enter a valid URL." })
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
      message: `Submission text must be at least ${MIN_SUBMISSION_TEXT_LENGTH} characters.`,
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
