import {
  type DashboardOverviewResponse,
  type DashboardCourse,
  type UpcomingAssignment,
  type RecentFeedback,
} from '@/features/dashboard/lib/dto';
import {
  formatDueDateTime,
  formatDueRelative,
  formatFeedbackTimestamp,
  formatProgressPercentage,
} from '@/features/dashboard/lib/formatters';

type CourseViewModel = DashboardCourse & {
  progressLabel: string;
  completionSummary: string;
  nextDueDateLabel: string | null;
  nextDueRelativeLabel: string | null;
};

type UpcomingAssignmentViewModel = UpcomingAssignment & {
  dueDateLabel: string;
  dueRelativeLabel: string;
};

type RecentFeedbackViewModel = RecentFeedback & {
  feedbackTimeLabel: string;
};

type DashboardSummaryViewModel = {
  activeCourseLabel: string;
  averageProgressLabel: string;
  upcomingAssignmentLabel: string;
};

type DashboardOverviewViewModel = {
  summary: DashboardSummaryViewModel;
  courses: CourseViewModel[];
  upcomingAssignments: UpcomingAssignmentViewModel[];
  recentFeedback: RecentFeedbackViewModel[];
};

const toCompletionSummary = (course: DashboardCourse) =>
  `${course.completedAssignments} / ${course.totalAssignments}`;

const enhanceCourse = (course: DashboardCourse): CourseViewModel => {
  const nextDueDateLabel = course.nextDueAt ? formatDueDateTime(course.nextDueAt) : null;
  const nextDueRelativeLabel = course.nextDueAt ? formatDueRelative(course.nextDueAt) : null;

  return {
    ...course,
    progressLabel: formatProgressPercentage(course.progressPercentage),
    completionSummary: toCompletionSummary(course),
    nextDueDateLabel,
    nextDueRelativeLabel,
  };
};

const enhanceUpcomingAssignment = (
  assignment: UpcomingAssignment,
): UpcomingAssignmentViewModel => ({
  ...assignment,
  dueDateLabel: formatDueDateTime(assignment.dueAt),
  dueRelativeLabel: formatDueRelative(assignment.dueAt),
});

const enhanceRecentFeedback = (feedback: RecentFeedback): RecentFeedbackViewModel => ({
  ...feedback,
  feedbackTimeLabel: formatFeedbackTimestamp(feedback.feedbackUpdatedAt),
});

export const mapDashboardOverview = (
  overview: DashboardOverviewResponse,
): DashboardOverviewViewModel => ({
  summary: {
    activeCourseLabel: `${overview.summary.activeCourseCount}`,
    averageProgressLabel: formatProgressPercentage(overview.summary.averageProgress),
    upcomingAssignmentLabel: `${overview.summary.upcomingAssignmentCount}`,
  },
  courses: overview.courses.map(enhanceCourse),
  upcomingAssignments: overview.upcomingAssignments.map(enhanceUpcomingAssignment),
  recentFeedback: overview.recentFeedback.map(enhanceRecentFeedback),
});

export type {
  DashboardOverviewViewModel,
  CourseViewModel,
  UpcomingAssignmentViewModel,
  RecentFeedbackViewModel,
  DashboardSummaryViewModel,
};