import { format, formatDistanceToNow } from 'date-fns';
import {
  DEFAULT_PICSUM_DIMENSIONS,
  DEFAULT_PICSUM_IMAGE_PROVIDER,
} from '@/features/instructor/common/constants';
import {
  INSTRUCTOR_COURSES_PICSUM_SEED_PREFIX,
  COURSE_STATUS_TRANSITIONS,
} from '@/features/instructor-courses/constants';
import {
  CourseListResponseSchema,
  CourseResponseSchema,
  type CourseListResponse,
  type CourseResponse,
} from '@/features/instructor-courses/lib/dto';
import type { CourseStatus } from '@/features/instructor-courses/lib/dto';

const statusLabels: Record<CourseStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

const statusDescriptions: Record<CourseStatus, string> = {
  draft: 'Prepare your course content before publishing.',
  published: 'Visible to learners in the catalog.',
  archived: 'Enrollment closed and hidden from catalog.',
};

const statusBadgeVariants: Record<CourseStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
};

const buildCourseCoverUrl = (courseId: string) => {
  const { width, height } = DEFAULT_PICSUM_DIMENSIONS;
  const seed = `${INSTRUCTOR_COURSES_PICSUM_SEED_PREFIX}-${encodeURIComponent(courseId)}`;
  return `${DEFAULT_PICSUM_IMAGE_PROVIDER}/seed/${seed}/${width}/${height}`;
};

const formatTimestamp = (isoDate: string) =>
  format(new Date(isoDate), 'MMM d, yyyy');

const formatRelativeTimestamp = (isoDate: string) =>
  formatDistanceToNow(new Date(isoDate), { addSuffix: true });

export type InstructorCourseSummary = {
  id: string;
  title: string;
  description: string;
  curriculum: string;
  category: {
    id: string;
    name: string;
  };
  difficulty: {
    id: string;
    label: string;
  };
  status: CourseStatus;
  statusLabel: string;
  statusDescription: string;
  statusBadgeVariant: 'secondary' | 'default' | 'outline';
  createdAtLabel: string;
  updatedAtLabel: string;
  updatedAtRelative: string;
  coverImageUrl: string;
  allowedTransitions: readonly CourseStatus[];
};

export type InstructorCourseListViewModel = {
  courses: InstructorCourseSummary[];
  statusCounts: CourseListResponse['statusCounts'];
  metadata: CourseListResponse['metadata'];
};

export const mapCourseListResponse = (
  input: CourseListResponse,
): InstructorCourseListViewModel => {
  const parsed = CourseListResponseSchema.parse(input);

  const courses = parsed.courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    curriculum: course.curriculum,
    category: {
      id: course.categoryId,
      name: course.categoryName,
    },
    difficulty: {
      id: course.difficultyId,
      label: course.difficultyLabel,
    },
    status: course.status,
    statusLabel: statusLabels[course.status],
    statusDescription: statusDescriptions[course.status],
    statusBadgeVariant: statusBadgeVariants[course.status],
    createdAtLabel: formatTimestamp(course.createdAt),
    updatedAtLabel: formatTimestamp(course.updatedAt),
    updatedAtRelative: formatRelativeTimestamp(course.updatedAt),
    coverImageUrl: buildCourseCoverUrl(course.id),
    allowedTransitions: COURSE_STATUS_TRANSITIONS[course.status],
  }));

  return {
    courses,
    statusCounts: parsed.statusCounts,
    metadata: parsed.metadata,
  } satisfies InstructorCourseListViewModel;
};

export const mapCourseResponse = (input: CourseResponse) =>
  CourseResponseSchema.parse(input);
