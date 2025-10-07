export const instructorDashboardErrorCodes = {
  unauthorized: 'INSTRUCTOR_DASHBOARD_UNAUTHORIZED',
  authUserLookupFailed: 'INSTRUCTOR_DASHBOARD_AUTH_USER_LOOKUP_FAILED',
  profileLookupFailed: 'INSTRUCTOR_DASHBOARD_PROFILE_LOOKUP_FAILED',
  profileNotFound: 'INSTRUCTOR_DASHBOARD_PROFILE_NOT_FOUND',
  courseFetchFailed: 'INSTRUCTOR_DASHBOARD_COURSE_FETCH_FAILED',
  assignmentFetchFailed: 'INSTRUCTOR_DASHBOARD_ASSIGNMENT_FETCH_FAILED',
  pendingFetchFailed: 'INSTRUCTOR_DASHBOARD_PENDING_SUBMISSION_FETCH_FAILED',
  recentFetchFailed: 'INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_FETCH_FAILED',
  responseValidationFailed: 'INSTRUCTOR_DASHBOARD_RESPONSE_VALIDATION_FAILED',
} as const;

export type InstructorDashboardErrorCode =
  (typeof instructorDashboardErrorCodes)[keyof typeof instructorDashboardErrorCodes];

export type InstructorDashboardServiceError = InstructorDashboardErrorCode;
