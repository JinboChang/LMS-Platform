import { z } from 'zod';

export const AssignmentFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  description: z.string().trim().min(1, 'Description is required.'),
  dueAt: z.string().min(1, 'Due date is required.'),
  scoreWeight: z.coerce
    .number({ invalid_type_error: 'Score weight must be a number.' })
    .refine((value) => Number.isFinite(value), 'Score weight must be numeric.')
    .refine((value) => value >= 0, 'Score weight must be at least 0.')
    .refine((value) => value <= 100, 'Score weight must be at most 100.'),
  instructions: z.string().trim().min(1, 'Instructions are required.'),
  submissionRequirements: z
    .string()
    .trim()
    .min(1, 'Submission requirements are required.'),
  lateSubmissionAllowed: z.boolean(),
});

export type AssignmentFormValues = z.infer<typeof AssignmentFormSchema>;
