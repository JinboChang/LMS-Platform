export const courseErrorCodes = {
  invalidQuery: 'INVALID_COURSE_QUERY',
  fetchFailed: 'COURSE_FETCH_FAILED',
  notFound: 'COURSE_NOT_FOUND',
  notPublished: 'COURSE_NOT_PUBLISHED',
  unauthorized: 'COURSE_UNAUTHORIZED',
  learnerProfileMissing: 'LEARNER_PROFILE_MISSING',
} as const;

export type CourseServiceError =
  (typeof courseErrorCodes)[keyof typeof courseErrorCodes];

export const enrollmentErrorCodes = {
  invalidPayload: 'INVALID_ENROLLMENT_PAYLOAD',
  unauthorized: 'ENROLLMENT_UNAUTHORIZED',
  learnerProfileMissing: 'ENROLLMENT_LEARNER_PROFILE_MISSING',
  duplicateEnrollment: 'DUPLICATE_ENROLLMENT',
  enrollmentNotFound: 'ENROLLMENT_NOT_FOUND',
  enrollmentAlreadyCancelled: 'ENROLLMENT_ALREADY_CANCELLED',
  enrollmentUpdateFailed: 'ENROLLMENT_UPDATE_FAILED',
  enrollmentCreateFailed: 'ENROLLMENT_CREATE_FAILED',
  courseUnavailable: 'COURSE_UNAVAILABLE',
} as const;

export type EnrollmentServiceError =
  (typeof enrollmentErrorCodes)[keyof typeof enrollmentErrorCodes];
