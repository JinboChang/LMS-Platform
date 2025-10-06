import { z } from 'zod';

export const EnrollmentStatusSchema = z.enum(['active', 'cancelled']);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

export const AssignmentStatusSchema = z.enum(['draft', 'published', 'closed']);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const SubmissionStatusSchema = z.enum([
  'submitted',
  'graded',
  'resubmission_required',
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const AssignmentDetailParamsSchema = z.object({
  courseId: z.string().uuid({ message: 'courseId must be a valid UUID.' }),
  assignmentId: z.string().uuid({
    message: 'assignmentId must be a valid UUID.',
  }),
  learnerId: z.string().uuid({ message: 'learnerId must be a valid UUID.' }),
});
export type AssignmentDetailParams = z.infer<typeof AssignmentDetailParamsSchema>;

const numericLikeSchema = z.union([z.number(), z.string()]);

export const AssignmentTableRowSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  due_at: z.string().datetime({ message: 'due_at must be an ISO datetime.' }),
  score_weight: numericLikeSchema,
  instructions: z.string(),
  submission_requirements: z.string(),
  late_submission_allowed: z.boolean(),
  status: AssignmentStatusSchema,
});
export type AssignmentTableRow = z.infer<typeof AssignmentTableRowSchema>;

export const EnrollmentTableRowSchema = z.object({
  id: z.string().uuid(),
  learner_id: z.string().uuid(),
  course_id: z.string().uuid(),
  status: EnrollmentStatusSchema,
});
export type EnrollmentTableRow = z.infer<typeof EnrollmentTableRowSchema>;

export const SubmissionTableRowSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  submission_text: z.string(),
  submission_link: z.string().url().nullable(),
  status: SubmissionStatusSchema,
  late: z.boolean(),
  score: numericLikeSchema.nullable(),
  feedback_text: z.string().nullable(),
  submitted_at: z.string().datetime(),
  graded_at: z.string().datetime().nullable(),
  feedback_updated_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type SubmissionTableRow = z.infer<typeof SubmissionTableRowSchema>;

export const AssignmentDetailSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  dueAt: z.string().datetime(),
  scoreWeight: z.number(),
  instructions: z.string(),
  submissionRequirements: z.string(),
  lateSubmissionAllowed: z.boolean(),
  status: AssignmentStatusSchema,
});
export type AssignmentDetail = z.infer<typeof AssignmentDetailSchema>;

export const AssignmentSubmissionSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  learnerId: z.string().uuid(),
  submissionText: z.string(),
  submissionLink: z.string().url().nullable(),
  status: SubmissionStatusSchema,
  late: z.boolean(),
  score: z.number().nullable(),
  feedbackText: z.string().nullable(),
  submittedAt: z.string().datetime(),
  gradedAt: z.string().datetime().nullable(),
  feedbackUpdatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;

export const AssignmentDetailResponseSchema = z.object({
  assignment: AssignmentDetailSchema,
  submission: AssignmentSubmissionSchema.nullable(),
  canSubmit: z.boolean(),
  isLate: z.boolean(),
});
export type AssignmentDetailResponse = z.infer<
  typeof AssignmentDetailResponseSchema
>;
