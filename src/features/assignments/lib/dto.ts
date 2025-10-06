import { z } from 'zod';
import {
  AssignmentDetailResponseSchema,
  AssignmentDetailSchema,
  AssignmentSubmissionSchema,
} from '@/features/assignments/backend/schema';

export const AssignmentDetailDtoSchema = AssignmentDetailResponseSchema;
export type AssignmentDetailDto = z.infer<typeof AssignmentDetailDtoSchema>;

export const AssignmentDtoSchema = AssignmentDetailSchema;
export type AssignmentDto = z.infer<typeof AssignmentDtoSchema>;

export const AssignmentSubmissionDtoSchema = AssignmentSubmissionSchema;
export type AssignmentSubmissionDto = z.infer<typeof AssignmentSubmissionDtoSchema>;
