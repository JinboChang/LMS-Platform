export const dashboardErrorCodes = {
  invalidQuery: 'DASHBOARD_INVALID_QUERY',
  unauthorized: 'DASHBOARD_UNAUTHORIZED',
  authUserLookupFailed: 'DASHBOARD_AUTH_USER_LOOKUP_FAILED',
  profileLookupFailed: 'DASHBOARD_PROFILE_LOOKUP_FAILED',
  profileNotFound: 'DASHBOARD_PROFILE_NOT_FOUND',
  enrollmentFetchFailed: 'DASHBOARD_ENROLLMENT_FETCH_FAILED',
  assignmentFetchFailed: 'DASHBOARD_ASSIGNMENT_FETCH_FAILED',
  submissionFetchFailed: 'DASHBOARD_SUBMISSION_FETCH_FAILED',
  responseValidationFailed: 'DASHBOARD_RESPONSE_VALIDATION_FAILED',
} as const;

export type DashboardErrorCode =
  (typeof dashboardErrorCodes)[keyof typeof dashboardErrorCodes];

export type DashboardServiceError = DashboardErrorCode;
