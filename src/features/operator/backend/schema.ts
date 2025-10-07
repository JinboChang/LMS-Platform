import { z } from "zod";
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  DIFFICULTY_LABEL_MAX_LENGTH,
  DIFFICULTY_LABEL_MIN_LENGTH,
  REPORT_ACTION_NOTE_MAX_LENGTH,
  REPORT_ACTION_NOTE_MIN_LENGTH,
  REPORT_ACTION_TYPES,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASON_MAX_LENGTH,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from "@/features/operator/constants";

export const UserRoleSchema = z.enum(["learner", "instructor", "operator"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const OperatorUserProfileSchema = z.object({
  id: z.string().uuid(),
  authUserId: z.string().uuid(),
  role: UserRoleSchema,
  name: z.string().min(1),
  email: z.string().email(),
});

export type OperatorUserProfile = z.infer<typeof OperatorUserProfileSchema>;

export const ReportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES);
export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;

export const ReportActionTypeSchema = z.enum(REPORT_ACTION_TYPES);
export type ReportActionType = z.infer<typeof ReportActionTypeSchema>;

export const ReportFilterQuerySchema = z
  .object({
    status: ReportStatusSchema.optional(),
    targetType: ReportTargetTypeSchema.optional(),
    search: z
      .string()
      .trim()
      .min(1)
      .max(REPORT_REASON_MAX_LENGTH)
      .optional(),
    page: z
      .union([z.string(), z.number()])
      .transform((value) => Number(value))
      .pipe(z.number().int().positive())
      .optional(),
    pageSize: z
      .union([z.string(), z.number()])
      .transform((value) => Number(value))
      .pipe(z.number().int().positive())
      .optional(),
  })
  .partial({
    status: true,
    targetType: true,
    search: true,
    page: true,
    pageSize: true,
  });

export type ReportFilterQuery = z.infer<typeof ReportFilterQuerySchema>;

export const ReportStatusUpdateRequestSchema = z.object({
  status: ReportStatusSchema,
});

export type ReportStatusUpdateRequest = z.infer<
  typeof ReportStatusUpdateRequestSchema
>;

export const ReportActionRequestSchema = z.object({
  actionType: ReportActionTypeSchema,
  actionDetails: z
    .string()
    .trim()
    .min(REPORT_ACTION_NOTE_MIN_LENGTH)
    .max(REPORT_ACTION_NOTE_MAX_LENGTH),
});

export type ReportActionRequest = z.infer<typeof ReportActionRequestSchema>;

export const CategoryMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(CATEGORY_NAME_MIN_LENGTH)
    .max(CATEGORY_NAME_MAX_LENGTH),
  isActive: z.boolean().optional(),
});

export type CategoryMutation = z.infer<typeof CategoryMutationSchema>;

export const DifficultyMutationSchema = z.object({
  label: z
    .string()
    .trim()
    .min(DIFFICULTY_LABEL_MIN_LENGTH)
    .max(DIFFICULTY_LABEL_MAX_LENGTH),
  isActive: z.boolean().optional(),
});

export type DifficultyMutation = z.infer<typeof DifficultyMutationSchema>;

const UserRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export const ReportTableRowSchema = z.object({
  id: z.string().uuid(),
  reported_by: z.string().uuid(),
  target_type: ReportTargetTypeSchema,
  target_id: z.string().uuid(),
  reason: z.string().min(1).max(REPORT_REASON_MAX_LENGTH),
  details: z.string().nullable(),
  status: ReportStatusSchema,
  reported_at: z.string().datetime({ offset: true }),
  resolved_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  reporters: UserRowSchema.optional(),
  actions: z
    .array(
      z.object({
        id: z.string().uuid(),
        report_id: z.string().uuid(),
        action_type: ReportActionTypeSchema,
        action_details: z.string().nullable(),
        actioned_by: z.string().uuid(),
        actioned_at: z.string().datetime({ offset: true }),
        created_at: z.string().datetime({ offset: true }),
        updated_at: z.string().datetime({ offset: true }),
        actioned_users: UserRowSchema.optional(),
      }),
    )
    .optional(),
});

export type ReportTableRow = z.infer<typeof ReportTableRowSchema>;

export const ReportActionTableRowSchema = z.object({
  id: z.string().uuid(),
  report_id: z.string().uuid(),
  action_type: ReportActionTypeSchema,
  action_details: z.string().nullable(),
  actioned_by: z.string().uuid(),
  actioned_at: z.string().datetime({ offset: true }),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  actioned_users: UserRowSchema.optional(),
});

export type ReportActionTableRow = z.infer<typeof ReportActionTableRowSchema>;

export const CategoryTableRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  is_active: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type CategoryTableRow = z.infer<typeof CategoryTableRowSchema>;

export const DifficultyTableRowSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  is_active: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type DifficultyTableRow = z.infer<typeof DifficultyTableRowSchema>;

export const ReportActionSchema = z.object({
  id: z.string().uuid(),
  reportId: z.string().uuid(),
  actionType: ReportActionTypeSchema,
  actionDetails: z.string().nullable(),
  actionedBy: UserRowSchema,
  actionedAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ReportAction = z.infer<typeof ReportActionSchema>;

export const ReportSummarySchema = z.object({
  id: z.string().uuid(),
  status: ReportStatusSchema,
  target: z.object({
    type: ReportTargetTypeSchema,
    id: z.string().uuid(),
  }),
  reason: z.string().min(1).max(REPORT_REASON_MAX_LENGTH),
  details: z.string().nullable(),
  reporter: UserRowSchema,
  reportedAt: z.string().datetime({ offset: true }),
  resolvedAt: z.string().datetime({ offset: true }).nullable(),
  actionCount: z.number().int().nonnegative(),
  latestActionAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ReportSummary = z.infer<typeof ReportSummarySchema>;

export const ReportDetailSchema = ReportSummarySchema.extend({
  actions: z.array(ReportActionSchema),
});

export type ReportDetail = z.infer<typeof ReportDetailSchema>;

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(CATEGORY_NAME_MIN_LENGTH).max(CATEGORY_NAME_MAX_LENGTH),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Category = z.infer<typeof CategorySchema>;

export const DifficultySchema = z.object({
  id: z.string().uuid(),
  label: z
    .string()
    .min(DIFFICULTY_LABEL_MIN_LENGTH)
    .max(DIFFICULTY_LABEL_MAX_LENGTH),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Difficulty = z.infer<typeof DifficultySchema>;

export const ReportListResponseSchema = z.object({
  reports: z.array(ReportSummarySchema),
  total: z.number().int().nonnegative(),
});

export type ReportListResponse = z.infer<typeof ReportListResponseSchema>;
