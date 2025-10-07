export const instructorAssignmentsErrorCodes = {
  unauthorized: 'INSTRUCTOR_ASSIGNMENTS_UNAUTHORIZED',
  authUserLookupFailed: 'INSTRUCTOR_ASSIGNMENTS_AUTH_USER_LOOKUP_FAILED',
  profileLookupFailed: 'INSTRUCTOR_ASSIGNMENTS_PROFILE_LOOKUP_FAILED',
  profileNotFound: 'INSTRUCTOR_ASSIGNMENTS_PROFILE_NOT_FOUND',
  courseOwnershipFailed: 'INSTRUCTOR_ASSIGNMENTS_COURSE_OWNERSHIP_FAILED',
  courseNotFound: 'INSTRUCTOR_ASSIGNMENTS_COURSE_NOT_FOUND',
  assignmentFetchFailed: 'INSTRUCTOR_ASSIGNMENTS_FETCH_FAILED',
  assignmentNotFound: 'INSTRUCTOR_ASSIGNMENTS_NOT_FOUND',
  validationFailed: 'INSTRUCTOR_ASSIGNMENTS_VALIDATION_FAILED',
  createFailed: 'INSTRUCTOR_ASSIGNMENTS_CREATE_FAILED',
  updateFailed: 'INSTRUCTOR_ASSIGNMENTS_UPDATE_FAILED',
  duplicateAssignment: 'INSTRUCTOR_ASSIGNMENTS_DUPLICATE_ASSIGNMENT',
  scoreWeightExceeded: 'INSTRUCTOR_ASSIGNMENTS_SCORE_WEIGHT_EXCEEDED',
  statusTransitionInvalid: 'INSTRUCTOR_ASSIGNMENTS_STATUS_TRANSITION_INVALID',
} as const;

export type InstructorAssignmentsErrorCode =
  (typeof instructorAssignmentsErrorCodes)[keyof typeof instructorAssignmentsErrorCodes];
