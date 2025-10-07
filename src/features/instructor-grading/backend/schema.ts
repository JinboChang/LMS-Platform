import { z } from 'zod';
import { SUBMISSION_STATUS_VALUES } from '@/features/instructor/common/constants';

export const SubmissionStatusSchema = z.enum(SUBMISSION_STATUS_VALUES);

const numericScoreSchema = z
  .number({ invalid_type_error: 'Score must be a number.' })
  .min(0, 'Score must be at least 0.')
  .max(100, 'Score must be at most 100.');

const feedbackSchema = z
  .string()
  .trim()
  .max(5000, 'Feedback must be 5000 characters or fewer.')
  .optional();

export const GradeSubmissionRequestSchema = z
  .object({
    score: numericScoreSchema,
    feedbackText: feedbackSchema,
    requireResubmission: z.boolean().optional().default(false),
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

export const SubmissionLearnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).nullable(),
  email: z.string().email().nullable(),
});

export const SubmissionDetailSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  assignmentTitle: z.string().min(1),
  assignmentDueAt: z.string().datetime({ offset: true }),
  courseId: z.string().uuid(),
  courseTitle: z.string().min(1),
  learner: SubmissionLearnerSchema,
  submissionText: z.string().nullable(),
  submissionLink: z.string().nullable(),
  status: SubmissionStatusSchema,
  late: z.boolean(),
  score: numericScoreSchema.nullable(),
  feedbackText: z.string().nullable(),
  requireResubmission: z.boolean(),
  submittedAt: z.string().datetime({ offset: true }),
  gradedAt: z.string().datetime({ offset: true }).nullable(),
  feedbackUpdatedAt: z.string().datetime({ offset: true }).nullable(),
});

export const SubmissionDetailResponseSchema = z.object({
  submission: SubmissionDetailSchema,
});

export const GradeSubmissionResponseSchema = SubmissionDetailResponseSchema;

export type GradeSubmissionRequest = z.infer<typeof GradeSubmissionRequestSchema>;
export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;
export type SubmissionDetailResponse = z.infer<typeof SubmissionDetailResponseSchema>;
export type GradeSubmissionResponse = z.infer<typeof GradeSubmissionResponseSchema>;
