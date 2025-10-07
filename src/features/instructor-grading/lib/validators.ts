import { z } from 'zod';

export const GradeSubmissionFormSchema = z
  .object({
    score: z.coerce
      .number({ invalid_type_error: 'Score must be numeric.' })
      .min(0, 'Score must be at least 0.')
      .max(100, 'Score must be at most 100.'),
    feedbackText: z
      .string()
      .trim()
      .max(5000, 'Feedback must be 5000 characters or fewer.')
      .optional(),
    requireResubmission: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.requireResubmission) {
      const feedback = value.feedbackText?.trim();

      if (!feedback) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Feedback is required when requesting resubmission.',
          path: ['feedbackText'],
        });
      }
    }
  });

export type GradeSubmissionFormValues = z.infer<typeof GradeSubmissionFormSchema>;
