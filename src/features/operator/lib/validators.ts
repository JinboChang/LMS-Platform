"use client";

import { z } from "zod";
import {
  OperatorCategoryPayloadSchema,
  OperatorDifficultyPayloadSchema,
  OperatorReportActionPayloadSchema,
  OperatorReportActionTypeSchema,
  OperatorReportStatusPayloadSchema,
  OperatorReportStatusSchema,
} from "@/features/operator/lib/dto";

export const OperatorReportProcessFormSchema = z
  .object({
    status: OperatorReportStatusSchema,
    actionType: OperatorReportActionTypeSchema,
    actionDetails: OperatorReportActionPayloadSchema.shape.actionDetails,
  })
  .superRefine((value, ctx) => {
    if (value.status === "resolved" && value.actionDetails.trim().length === 0) {
      ctx.addIssue({
        path: ["actionDetails"],
        code: z.ZodIssueCode.custom,
        message: "처리 메모를 입력해주세요.",
      });
    }
  });

export type OperatorReportProcessFormValues = z.infer<
  typeof OperatorReportProcessFormSchema
>;

export const OperatorReportStatusFormSchema = OperatorReportStatusPayloadSchema;
export type OperatorReportStatusFormValues = z.infer<
  typeof OperatorReportStatusFormSchema
>;

export const OperatorReportActionFormSchema = OperatorReportActionPayloadSchema;
export type OperatorReportActionFormValues = z.infer<
  typeof OperatorReportActionFormSchema
>;

export const OperatorCategoryFormSchema = OperatorCategoryPayloadSchema;
export type OperatorCategoryFormValues = z.infer<
  typeof OperatorCategoryFormSchema
>;

export const OperatorDifficultyFormSchema = OperatorDifficultyPayloadSchema;
export type OperatorDifficultyFormValues = z.infer<
  typeof OperatorDifficultyFormSchema
>;

