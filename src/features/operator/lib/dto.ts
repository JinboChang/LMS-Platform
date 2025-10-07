import { z } from "zod";
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  DIFFICULTY_LABEL_MAX_LENGTH,
  DIFFICULTY_LABEL_MIN_LENGTH,
  REPORT_ACTION_NOTE_MAX_LENGTH,
  REPORT_ACTION_NOTE_MIN_LENGTH,
  REPORT_ACTION_TYPES,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from "@/features/operator/constants";

export const OperatorReportStatusSchema = z.enum(REPORT_STATUSES);
export type OperatorReportStatus = z.infer<typeof OperatorReportStatusSchema>;

export const OperatorReportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES);
export type OperatorReportTargetType = z.infer<
  typeof OperatorReportTargetTypeSchema
>;

export const OperatorReportActionTypeSchema = z.enum(REPORT_ACTION_TYPES);
export type OperatorReportActionType = z.infer<
  typeof OperatorReportActionTypeSchema
>;

export const OperatorUserSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export const OperatorReportActionSchema = z.object({
  id: z.string().uuid(),
  reportId: z.string().uuid(),
  actionType: OperatorReportActionTypeSchema,
  actionDetails: z.string().nullable(),
  actionedBy: OperatorUserSummarySchema,
  actionedAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type OperatorReportAction = z.infer<typeof OperatorReportActionSchema>;

export const OperatorReportSummarySchema = z.object({
  id: z.string().uuid(),
  status: OperatorReportStatusSchema,
  target: z.object({
    type: OperatorReportTargetTypeSchema,
    id: z.string().uuid(),
  }),
  reason: z.string().min(1),
  details: z.string().nullable(),
  reporter: OperatorUserSummarySchema,
  reportedAt: z.string().datetime({ offset: true }),
  resolvedAt: z.string().datetime({ offset: true }).nullable(),
  actionCount: z.number().int().nonnegative(),
  latestActionAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type OperatorReportSummary = z.infer<typeof OperatorReportSummarySchema>;

export const OperatorReportDetailSchema =
  OperatorReportSummarySchema.extend({
    actions: z.array(OperatorReportActionSchema),
  });

export type OperatorReportDetail = z.infer<
  typeof OperatorReportDetailSchema
>;

export const OperatorReportListResponseSchema = z.object({
  reports: z.array(OperatorReportSummarySchema),
  total: z.number().int().nonnegative(),
});

export type OperatorReportListResponse = z.infer<
  typeof OperatorReportListResponseSchema
>;

export const OperatorReportFilterSchema = z.object({
  status: OperatorReportStatusSchema.optional(),
  targetType: OperatorReportTargetTypeSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export type OperatorReportFilter = z.infer<
  typeof OperatorReportFilterSchema
>;

export const OperatorReportStatusPayloadSchema = z.object({
  status: OperatorReportStatusSchema,
});

export type OperatorReportStatusPayload = z.infer<
  typeof OperatorReportStatusPayloadSchema
>;

export const OperatorReportActionPayloadSchema = z.object({
  actionType: OperatorReportActionTypeSchema,
  actionDetails: z
    .string()
    .trim()
    .min(REPORT_ACTION_NOTE_MIN_LENGTH)
    .max(REPORT_ACTION_NOTE_MAX_LENGTH),
});

export type OperatorReportActionPayload = z.infer<
  typeof OperatorReportActionPayloadSchema
>;

export const OperatorCategorySchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(CATEGORY_NAME_MIN_LENGTH)
    .max(CATEGORY_NAME_MAX_LENGTH),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type OperatorCategory = z.infer<typeof OperatorCategorySchema>;

export const OperatorDifficultySchema = z.object({
  id: z.string().uuid(),
  label: z
    .string()
    .min(DIFFICULTY_LABEL_MIN_LENGTH)
    .max(DIFFICULTY_LABEL_MAX_LENGTH),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type OperatorDifficulty = z.infer<typeof OperatorDifficultySchema>;

export const OperatorCategoryPayloadSchema = z.object({
  name: z
    .string()
    .min(CATEGORY_NAME_MIN_LENGTH)
    .max(CATEGORY_NAME_MAX_LENGTH),
  isActive: z.boolean().optional(),
});

export type OperatorCategoryPayload = z.infer<
  typeof OperatorCategoryPayloadSchema
>;

export const OperatorDifficultyPayloadSchema = z.object({
  label: z
    .string()
    .min(DIFFICULTY_LABEL_MIN_LENGTH)
    .max(DIFFICULTY_LABEL_MAX_LENGTH),
  isActive: z.boolean().optional(),
});

export type OperatorDifficultyPayload = z.infer<
  typeof OperatorDifficultyPayloadSchema
>;

export const OperatorReportStatusLabelMap = REPORT_STATUS_LABELS;

