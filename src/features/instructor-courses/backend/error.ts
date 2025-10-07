export const instructorCoursesErrorCodes = {
  unauthorized: 'INSTRUCTOR_COURSES_UNAUTHORIZED',
  authUserLookupFailed: 'INSTRUCTOR_COURSES_AUTH_USER_LOOKUP_FAILED',
  profileLookupFailed: 'INSTRUCTOR_COURSES_PROFILE_LOOKUP_FAILED',
  profileNotFound: 'INSTRUCTOR_COURSES_PROFILE_NOT_FOUND',
  fetchFailed: 'INSTRUCTOR_COURSES_FETCH_FAILED',
  metadataFetchFailed: 'INSTRUCTOR_COURSES_METADATA_FETCH_FAILED',
  createFailed: 'INSTRUCTOR_COURSES_CREATE_FAILED',
  updateFailed: 'INSTRUCTOR_COURSES_UPDATE_FAILED',
  statusTransitionInvalid: 'INSTRUCTOR_COURSES_STATUS_TRANSITION_INVALID',
  validationFailed: 'INSTRUCTOR_COURSES_VALIDATION_FAILED',
  forbidden: 'INSTRUCTOR_COURSES_FORBIDDEN',
} as const;

export type InstructorCoursesErrorCode =
  (typeof instructorCoursesErrorCodes)[keyof typeof instructorCoursesErrorCodes];
