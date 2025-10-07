import { z } from 'zod';
import { AssignmentStatusSchema } from '@/features/instructor-assignments/backend/schema';

export const ChangeAssignmentStatusRequestSchema = z.object({
  nextStatus: AssignmentStatusSchema,
});

export const AssignmentStatusResponseSchema = z.object({
  status: AssignmentStatusSchema,
  publishedAt: z.string().datetime().nullable().optional(),
  closedAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime(),
});

export type ChangeAssignmentStatusRequest = z.infer<
  typeof ChangeAssignmentStatusRequestSchema
>;

export type AssignmentStatusResponse = z.infer<
  typeof AssignmentStatusResponseSchema
>;

