import { z } from "zod";

export const assignmentStatuses = [
  "draft",
  "published",
  "closed",
] as const satisfies readonly string[];

export const submissionStatuses = [
  "submitted",
  "graded",
  "resubmission_required",
] as const satisfies readonly string[];

export const enrollmentStatuses = ["active", "cancelled"] as const satisfies readonly string[];

const optionalUrlSchema = z
  .string()
  .trim()
  .url({ message: "Please enter a valid URL." })
  .optional()
  .or(
    z
      .literal("")
      .transform(() => undefined),
  );

export const AssignmentSubmissionRequestSchema = z
  .object({
    authUserId: z
      .string()
      .uuid({ message: "Auth user ID must be a valid UUID." }),
    submissionText: z
      .string()
      .trim()
      .min(1, { message: "Submission text is required." }),
    submissionLink: optionalUrlSchema,
  })
  .transform((value) => ({
    authUserId: value.authUserId,
    submissionText: value.submissionText,
    submissionLink: value.submissionLink ?? undefined,
  }));

export type AssignmentSubmissionRequest = z.infer<
  typeof AssignmentSubmissionRequestSchema
>;

export const AssignmentSubmissionRowSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  submission_text: z.string(),
  submission_link: z.string().nullable(),
  status: z.enum(submissionStatuses),
  late: z.boolean(),
  submitted_at: z.string().datetime({ offset: true }),
  graded_at: z.string().datetime({ offset: true }).nullable(),
  feedback_text: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type AssignmentSubmissionRow = z.infer<
  typeof AssignmentSubmissionRowSchema
>;

export const AssignmentSummarySchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  status: z.enum(assignmentStatuses),
  due_at: z.string().datetime({ offset: true }),
  late_submission_allowed: z.boolean(),
});

export type AssignmentSummary = z.infer<typeof AssignmentSummarySchema>;

export const EnrollmentSummarySchema = z.object({
  id: z.string().uuid(),
  learner_id: z.string().uuid(),
  course_id: z.string().uuid(),
  status: z.enum(enrollmentStatuses),
});

export type EnrollmentSummary = z.infer<typeof EnrollmentSummarySchema>;

export const AssignmentSubmissionResponseSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  learnerId: z.string().uuid(),
  status: z.enum(submissionStatuses),
  submittedAt: z.string().datetime({ offset: true }),
  late: z.boolean(),
  isResubmission: z.boolean(),
  message: z.string(),
  previousStatus: z.enum(submissionStatuses).nullable(),
});

export type AssignmentSubmissionResponse = z.infer<
  typeof AssignmentSubmissionResponseSchema
>;
