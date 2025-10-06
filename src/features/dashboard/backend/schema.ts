import { z } from 'zod';

export const CourseStatusSchema = z.enum(['draft', 'published', 'archived']);
export const AssignmentStatusSchema = z.enum(['draft', 'published', 'closed']);
export const SubmissionStatusSchema = z.enum([
  'submitted',
  'graded',
  'resubmission_required',
]);

export const EnrollmentRowSchema = z.object({
  course_id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }),
  courses: z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1),
      status: CourseStatusSchema,
    })
    .nullable()
    .optional(),
});

export const AssignmentRowSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string().min(1),
  due_at: z.string().datetime({ offset: true }),
  status: AssignmentStatusSchema,
  late_submission_allowed: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const SubmissionRowSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  status: SubmissionStatusSchema,
  score: z.number().min(0).max(100).nullable(),
  feedback_text: z.string().nullable(),
  submitted_at: z.string().datetime({ offset: true }),
  graded_at: z.string().datetime({ offset: true }).nullable(),
  feedback_updated_at: z.string().datetime({ offset: true }).nullable(),
  late: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const LearnerProfileRowSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  role: z.literal('learner'),
});

export const DashboardCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  coverImageUrl: z.string().url(),
  progressPercentage: z.number().min(0).max(100),
  completedAssignments: z.number().int().nonnegative(),
  totalAssignments: z.number().int().nonnegative(),
  nextDueAt: z.string().datetime({ offset: true }).nullable(),
});

export const UpcomingAssignmentSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  title: z.string(),
  dueAt: z.string().datetime({ offset: true }),
  lateSubmissionAllowed: z.boolean(),
});

export const RecentFeedbackSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  assignmentTitle: z.string(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  score: z.number().min(0).max(100).nullable(),
  feedbackText: z.string().nullable(),
  feedbackUpdatedAt: z.string().datetime({ offset: true }),
});

export const DashboardOverviewResponseSchema = z.object({
  summary: z.object({
    activeCourseCount: z.number().int().nonnegative(),
    averageProgress: z.number().min(0).max(100),
    upcomingAssignmentCount: z.number().int().nonnegative(),
  }),
  courses: z.array(DashboardCourseSchema),
  upcomingAssignments: z.array(UpcomingAssignmentSchema),
  recentFeedback: z.array(RecentFeedbackSchema),
});

export type EnrollmentRow = z.infer<typeof EnrollmentRowSchema>;
export type AssignmentRow = z.infer<typeof AssignmentRowSchema>;
export type SubmissionRow = z.infer<typeof SubmissionRowSchema>;
export type DashboardCourse = z.infer<typeof DashboardCourseSchema>;
export type UpcomingAssignment = z.infer<typeof UpcomingAssignmentSchema>;
export type RecentFeedback = z.infer<typeof RecentFeedbackSchema>;
export type DashboardOverviewResponse = z.infer<
  typeof DashboardOverviewResponseSchema
>;
export type LearnerProfileRow = z.infer<typeof LearnerProfileRowSchema>;