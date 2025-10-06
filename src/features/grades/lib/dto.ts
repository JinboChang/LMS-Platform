import {
  AssignmentGradeSchema,
  CourseGradeSummarySchema,
  CourseGradesResponseSchema,
  GradesOverviewResponseSchema,
  type AssignmentGrade,
  type CourseGradeSummary,
  type CourseGradesResponse,
  type GradesOverviewResponse,
} from "@/features/grades/backend/schema";

export const parseGradesOverviewResponse = (payload: unknown) =>
  GradesOverviewResponseSchema.parse(payload);

export const parseCourseGradesResponse = (payload: unknown) =>
  CourseGradesResponseSchema.parse(payload);

export {
  AssignmentGradeSchema,
  CourseGradeSummarySchema,
  CourseGradesResponseSchema,
  GradesOverviewResponseSchema,
};

export type {
  AssignmentGrade,
  CourseGradeSummary,
  CourseGradesResponse,
  GradesOverviewResponse,
};
