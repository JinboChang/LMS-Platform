import { z } from 'zod';
import {
  INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS,
  INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER,
  INSTRUCTOR_DASHBOARD_PENDING_DISPLAY_LIMIT,
  INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_DISPLAY_LIMIT,
  INSTRUCTOR_DASHBOARD_STATUS_ORDER,
} from '@/features/instructor-dashboard/constants';
import {
  CourseStatusSchema,
  InstructorDashboardResponseSchema,
  SubmissionStatusSchema,
  type InstructorDashboardResponse,
  type InstructorCourse,
  type PendingGradingItem,
  type RecentSubmissionItem,
} from '@/features/instructor-dashboard/lib/dto';

const buildSubmissionLink = (
  courseId: string,
  assignmentId: string,
  submissionId: string,
) => `/instructor/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}`;

type CourseStatus = z.infer<typeof CourseStatusSchema>;
type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export type InstructorDashboardCourseCard = InstructorCourse & {
  coverImageUrl: string;
};

export type InstructorDashboardCourseBucket = {
  status: CourseStatus;
  label: string;
  description: string;
  count: number;
  courses: InstructorDashboardCourseCard[];
};

const submissionStatusLabels: Record<SubmissionStatus, string> = {
  submitted: 'Submitted',
  graded: 'Graded',
  resubmission_required: 'Resubmission required',
};

type StatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const submissionStatusVariants: Record<SubmissionStatus, StatusBadgeVariant> = {
  submitted: 'secondary',
  graded: 'default',
  resubmission_required: 'destructive',
};

export type InstructorDashboardGradingQueueItem = PendingGradingItem & {
  statusLabel: string;
  badgeVariant: StatusBadgeVariant;
  assignmentLink: string;
};

export type InstructorDashboardRecentSubmissionItem = RecentSubmissionItem & {
  statusLabel: string;
  badgeVariant: StatusBadgeVariant;
  assignmentLink: string;
};

export type InstructorDashboardViewModel = {
  totalCourseCount: number;
  courseBuckets: InstructorDashboardCourseBucket[];
  pendingGrading: InstructorDashboardGradingQueueItem[];
  recentSubmissions: InstructorDashboardRecentSubmissionItem[];
};

const courseStatusLabels: Record<CourseStatus, string> = {
  published: 'Published courses',
  draft: 'Draft courses',
  archived: 'Archived courses',
};

const courseStatusDescriptions: Record<CourseStatus, string> = {
  published: 'Live courses visible to learners.',
  draft: 'Work-in-progress courses awaiting publication.',
  archived: 'Retired courses kept for record keeping.',
};

const buildCourseCoverUrl = (courseId: string) => {
  const { width, height } = INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS;
  const encodedId = encodeURIComponent(courseId);
  return `${INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER}/seed/instructor-course-${encodedId}/${width}/${height}`;
};

const enrichCourse = (course: InstructorCourse): InstructorDashboardCourseCard => ({
  ...course,
  coverImageUrl: buildCourseCoverUrl(course.id),
});

const sortBuckets = (
  buckets: InstructorDashboardCourseBucket[],
): InstructorDashboardCourseBucket[] => {
  const orderMap = new Map(
    INSTRUCTOR_DASHBOARD_STATUS_ORDER.map((status, index) => [status, index]),
  );

  return [...buckets].sort((left, right) => {
    const leftIndex = orderMap.get(left.status) ?? 0;
    const rightIndex = orderMap.get(right.status) ?? 0;
    return leftIndex - rightIndex;
  });
};

const limitItems = <T>(items: readonly T[], limit: number) =>
  items.slice(0, Math.max(0, limit));

const mapGradingQueueItem = (
  item: PendingGradingItem,
): InstructorDashboardGradingQueueItem => ({
  ...item,
  statusLabel: submissionStatusLabels[item.status],
  badgeVariant: submissionStatusVariants[item.status],
  assignmentLink: buildSubmissionLink(item.courseId, item.assignmentId, item.submissionId),
});

const mapRecentSubmissionItem = (
  item: RecentSubmissionItem,
): InstructorDashboardRecentSubmissionItem => ({
  ...item,
  statusLabel: submissionStatusLabels[item.status],
  badgeVariant: submissionStatusVariants[item.status],
  assignmentLink: buildSubmissionLink(item.courseId, item.assignmentId, item.submissionId),
});

export const mapInstructorDashboard = (
  input: InstructorDashboardResponse,
): InstructorDashboardViewModel => {
  const parsed = InstructorDashboardResponseSchema.parse(input);

  const courseBuckets = sortBuckets(
    Object.entries(parsed.courses.buckets).map(([status, courses]) => ({
      status: status as CourseStatus,
      label: courseStatusLabels[status as CourseStatus],
      description: courseStatusDescriptions[status as CourseStatus],
      count: courses.length,
      courses: courses.map(enrichCourse),
    })),
  );

  const pendingItems = limitItems(
    parsed.pendingGrading.map(mapGradingQueueItem),
    INSTRUCTOR_DASHBOARD_PENDING_DISPLAY_LIMIT,
  );

  const recentItems = limitItems(
    parsed.recentSubmissions.map(mapRecentSubmissionItem),
    INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_DISPLAY_LIMIT,
  );

  return {
    totalCourseCount: parsed.courses.totalCount,
    courseBuckets,
    pendingGrading: pendingItems,
    recentSubmissions: recentItems,
  } satisfies InstructorDashboardViewModel;
};
