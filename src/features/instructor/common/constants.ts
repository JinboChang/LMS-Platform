export const COURSE_STATUS_VALUES = ['draft', 'published', 'archived'] as const;

export const ASSIGNMENT_STATUS_VALUES = ['draft', 'published', 'closed'] as const;

export const SUBMISSION_STATUS_VALUES = [
  'submitted',
  'graded',
  'resubmission_required',
] as const;

export const DEFAULT_PICSUM_IMAGE_PROVIDER = 'https://picsum.photos';

export const DEFAULT_PICSUM_DIMENSIONS = {
  width: 960,
  height: 540,
} as const;
