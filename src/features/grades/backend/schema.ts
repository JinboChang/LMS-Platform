import { z } from "zod";

export const AssignmentStatusSchema = z.enum(["draft", "published", "closed"]);
export const SubmissionStatusSchema = z.enum([
  "submitted",
  "graded",
  "resubmission_required",
]);

export const UserRoleSchema = z.enum([
  "learner",
  "instructor",
  "operator",
]);

export const GradeOverviewQuerySchema = z.object({
  learnerId: z.string().uuid(),
});

export const CourseGradesParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const CourseRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
});

export const LearnerProfileRowSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  role: UserRoleSchema,
});

export const EnrollmentRowSchema = z.object({
  course_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  status: z.literal("active"),
  courses: CourseRowSchema.nullable().optional(),
});

const parseNumeric = (value: string | number | null) => {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error("Invalid numeric value");
  }

  return parsed;
};

export const AssignmentRowSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string().min(1),
  due_at: z.string().datetime({ offset: true }),
  status: AssignmentStatusSchema,
  score_weight: z.union([z.string(), z.number()]).transform((value) =>
    parseNumeric(value) ?? 0
  ),
  late_submission_allowed: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const SubmissionRowSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  status: SubmissionStatusSchema,
  score: z
    .union([z.string(), z.number(), z.null()])
    .transform((value) => parseNumeric(value)),
  feedback_text: z.string().nullable(),
  submitted_at: z.string().datetime({ offset: true }).nullable(),
  graded_at: z.string().datetime({ offset: true }).nullable(),
  feedback_updated_at: z.string().datetime({ offset: true }).nullable(),
  late: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const LatestFeedbackSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  assignmentTitle: z.string(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  score: z.number().min(0).max(100).nullable(),
  feedbackText: z.string().nullable(),
  feedbackUpdatedAt: z.string().datetime({ offset: true }),
});

export const CourseGradeSummarySchema = z.object({
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  weightedScore: z.number().min(0).max(100).nullable(),
  gradedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  pendingFeedbackCount: z.number().int().nonnegative(),
  lateSubmissionCount: z.number().int().nonnegative(),
  latestFeedback: LatestFeedbackSchema.nullable(),
});

export const GradesOverviewResponseSchema = z.object({
  learnerId: z.string().uuid(),
  aggregate: z.object({
    activeCourseCount: z.number().int().nonnegative(),
    gradedAssignmentCount: z.number().int().nonnegative(),
    pendingFeedbackCount: z.number().int().nonnegative(),
    lateSubmissionCount: z.number().int().nonnegative(),
    averageScore: z.number().min(0).max(100).nullable(),
  }),
  courses: z.array(CourseGradeSummarySchema),
});

export const AssignmentGradeSchema = z.object({
  assignmentId: z.string().uuid(),
  title: z.string(),
  dueAt: z.string().datetime({ offset: true }),
  scoreWeight: z.number().min(0),
  submissionStatus: SubmissionStatusSchema,
  score: z.number().min(0).max(100).nullable(),
  feedbackText: z.string().nullable(),
  submittedAt: z.string().datetime({ offset: true }).nullable(),
  gradedAt: z.string().datetime({ offset: true }).nullable(),
  feedbackUpdatedAt: z.string().datetime({ offset: true }).nullable(),
  late: z.boolean(),
});

export const CourseGradesResponseSchema = z.object({
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  weightedScore: z.number().min(0).max(100).nullable(),
  gradedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  pendingFeedbackCount: z.number().int().nonnegative(),
  lateSubmissionCount: z.number().int().nonnegative(),
  assignments: z.array(AssignmentGradeSchema),
});

export type GradeOverviewQuery = z.infer<typeof GradeOverviewQuerySchema>;
export type CourseGradesParams = z.infer<typeof CourseGradesParamsSchema>;
export type LearnerProfileRow = z.infer<typeof LearnerProfileRowSchema>;
export type EnrollmentRow = z.infer<typeof EnrollmentRowSchema>;
export type AssignmentRow = z.infer<typeof AssignmentRowSchema>;
export type SubmissionRow = z.infer<typeof SubmissionRowSchema>;
export type LatestFeedback = z.infer<typeof LatestFeedbackSchema>;
export type CourseGradeSummary = z.infer<typeof CourseGradeSummarySchema>;
export type GradesOverviewResponse = z.infer<typeof GradesOverviewResponseSchema>;
export type AssignmentGrade = z.infer<typeof AssignmentGradeSchema>;
export type CourseGradesResponse = z.infer<typeof CourseGradesResponseSchema>;
