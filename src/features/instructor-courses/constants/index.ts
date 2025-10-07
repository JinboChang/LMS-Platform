import { COURSE_STATUS_VALUES } from '@/features/instructor/common/constants';

export const INSTRUCTOR_COURSES_QUERY_KEY = ['instructor', 'courses'] as const;

export const COURSE_STATUS_TRANSITIONS: Record<
  (typeof COURSE_STATUS_VALUES)[number],
  readonly (typeof COURSE_STATUS_VALUES)[number][]
> = {
  draft: ['published'],
  published: ['archived'],
  archived: [],
};

export const INSTRUCTOR_COURSES_PICSUM_SEED_PREFIX = 'instructor-course';

export const COURSE_FORM_DEFAULT_STATUS = 'draft' as const;

export { COURSE_STATUS_VALUES };
