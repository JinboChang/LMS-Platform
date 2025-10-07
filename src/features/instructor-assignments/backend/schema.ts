import { z } from 'zod';
import { ASSIGNMENT_STATUS_VALUES } from '@/features/instructor/common/constants';

export const AssignmentStatusSchema = z.enum(ASSIGNMENT_STATUS_VALUES);

const numericScoreSchema = z
  .number({ invalid_type_error: 'Score weight must be a number.' })
  .min(0, 'Score weight must be at least 0.')
  .max(100, 'Score weight must be at most 100.');

export const AssignmentTableRowSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  due_at: z.string().datetime(),
  score_weight: z.number(),
  instructions: z.string().min(1),
  submission_requirements: z.string().min(1),
  late_submission_allowed: z.boolean(),
  status: AssignmentStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const AssignmentSubmissionAggregateSchema = z.object({
  assignment_id: z.string().uuid(),
  total_count: z.number().int().nonnegative(),
  pending_count: z.number().int().nonnegative(),
  graded_count: z.number().int().nonnegative(),
  late_count: z.number().int().nonnegative(),
});

export const AssignmentListItemSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  dueAt: z.string().datetime(),
  scoreWeight: z.number(),
  instructions: z.string().min(1),
  submissionRequirements: z.string().min(1),
  lateSubmissionAllowed: z.boolean(),
  status: AssignmentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  submissionStats: z.object({
    total: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    graded: z.number().int().nonnegative(),
    late: z.number().int().nonnegative(),
  }),
});

export const AssignmentStatusCountsSchema = z.object({
  draft: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
  closed: z.number().int().nonnegative(),
});

export const AssignmentListResponseSchema = z.object({
  assignments: z.array(AssignmentListItemSchema),
  statusCounts: AssignmentStatusCountsSchema,
});

export const AssignmentResponseSchema = z.object({
  assignment: AssignmentListItemSchema,
});

export const CreateAssignmentRequestSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  description: z.string().trim().min(1, 'Description is required.'),
  dueAt: z.string().datetime({ message: 'dueAt must be a valid ISO timestamp.' }),
  scoreWeight: numericScoreSchema,
  instructions: z.string().trim().min(1, 'Instructions are required.'),
  submissionRequirements: z
    .string()
    .trim()
    .min(1, 'Submission requirements are required.'),
  lateSubmissionAllowed: z.boolean(),
});

export const UpdateAssignmentRequestSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    dueAt: z.string().datetime().optional(),
    scoreWeight: numericScoreSchema.optional(),
    instructions: z.string().trim().min(1).optional(),
    submissionRequirements: z.string().trim().min(1).optional(),
    lateSubmissionAllowed: z.boolean().optional(),
    status: AssignmentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const ChangeAssignmentStatusRequestSchema = z.object({
  nextStatus: AssignmentStatusSchema,
});

export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;
export type AssignmentTableRow = z.infer<typeof AssignmentTableRowSchema>;
export type AssignmentListItem = z.infer<typeof AssignmentListItemSchema>;
export type AssignmentListResponse = z.infer<typeof AssignmentListResponseSchema>;
export type AssignmentResponse = z.infer<typeof AssignmentResponseSchema>;
export type CreateAssignmentRequest = z.infer<typeof CreateAssignmentRequestSchema>;
export type UpdateAssignmentRequest = z.infer<typeof UpdateAssignmentRequestSchema>;
export type ChangeAssignmentStatusRequest = z.infer<
  typeof ChangeAssignmentStatusRequestSchema
>;
export type AssignmentSubmissionAggregate = z.infer<
  typeof AssignmentSubmissionAggregateSchema
>;
