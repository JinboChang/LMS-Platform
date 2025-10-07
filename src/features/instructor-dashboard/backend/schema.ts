import { z } from 'zod';
import {
  ASSIGNMENT_STATUS_VALUES,
  COURSE_STATUS_VALUES,
  SUBMISSION_STATUS_VALUES,
} from '@/features/instructor-dashboard/constants';

export const CourseStatusSchema = z.enum(COURSE_STATUS_VALUES);
export const AssignmentStatusSchema = z.enum(ASSIGNMENT_STATUS_VALUES);
export const SubmissionStatusSchema = z.enum(SUBMISSION_STATUS_VALUES);

export const CourseRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  status: CourseStatusSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const AssignmentRowSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string().min(1),
  status: AssignmentStatusSchema,
  due_at: z.string().datetime({ offset: true }),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const SubmissionRowSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  status: SubmissionStatusSchema,
  late: z.boolean(),
  score: z.number().min(0).max(100).nullable(),
  feedback_text: z.string().nullable(),
  submitted_at: z.string().datetime({ offset: true }),
  graded_at: z.string().datetime({ offset: true }).nullable(),
  feedback_updated_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const SubmissionCourseRelationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  instructor_id: z.string().uuid(),
});

export const SubmissionAssignmentRelationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  course_id: z.string().uuid(),
  due_at: z.string().datetime({ offset: true }),
  courses: SubmissionCourseRelationSchema,
});

export const SubmissionLearnerRelationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export const SubmissionWithRelationsSchema = SubmissionRowSchema.extend({
  assignments: SubmissionAssignmentRelationSchema,
  learner: SubmissionLearnerRelationSchema,
});

export const InstructorCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  status: CourseStatusSchema,
  assignmentCount: z.number().int().nonnegative(),
  pendingGradingCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime({ offset: true }),
});

export const CourseStatusBucketsSchema = z.object({
  draft: z.array(InstructorCourseSchema),
  published: z.array(InstructorCourseSchema),
  archived: z.array(InstructorCourseSchema),
});

export const CoursesSectionSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  buckets: CourseStatusBucketsSchema,
});

export const PendingGradingItemSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  assignmentTitle: z.string().min(1),
  courseId: z.string().uuid(),
  courseTitle: z.string().min(1),
  learnerId: z.string().uuid(),
  learnerName: z.string().min(1),
  submittedAt: z.string().datetime({ offset: true }),
  status: SubmissionStatusSchema,
  late: z.boolean(),
});

export const RecentSubmissionItemSchema = PendingGradingItemSchema.extend({
  gradedAt: z.string().datetime({ offset: true }).nullable(),
  score: z.number().min(0).max(100).nullable(),
  feedbackText: z.string().nullable(),
});

export const InstructorDashboardResponseSchema = z.object({
  courses: CoursesSectionSchema,
  pendingGrading: z.array(PendingGradingItemSchema),
  recentSubmissions: z.array(RecentSubmissionItemSchema),
});

export type CourseRow = z.infer<typeof CourseRowSchema>;
export type AssignmentRow = z.infer<typeof AssignmentRowSchema>;
export type SubmissionRow = z.infer<typeof SubmissionRowSchema>;
export type SubmissionCourseRelation = z.infer<typeof SubmissionCourseRelationSchema>;
export type SubmissionAssignmentRelation = z.infer<
  typeof SubmissionAssignmentRelationSchema
>;
export type SubmissionLearnerRelation = z.infer<typeof SubmissionLearnerRelationSchema>;
export type SubmissionWithRelations = z.infer<typeof SubmissionWithRelationsSchema>;
export type InstructorCourse = z.infer<typeof InstructorCourseSchema>;
export type CourseStatusBuckets = z.infer<typeof CourseStatusBucketsSchema>;
export type CoursesSection = z.infer<typeof CoursesSectionSchema>;
export type PendingGradingItem = z.infer<typeof PendingGradingItemSchema>;
export type RecentSubmissionItem = z.infer<typeof RecentSubmissionItemSchema>;
export type InstructorDashboardResponse = z.infer<
  typeof InstructorDashboardResponseSchema
>;
