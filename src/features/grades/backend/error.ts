export const gradesErrorCodes = {
  invalidQuery: "GRADES_INVALID_QUERY",
  unauthorized: "GRADES_UNAUTHORIZED",
  forbidden: "GRADES_FORBIDDEN",
  enrollmentFetchFailed: "GRADES_ENROLLMENT_FETCH_FAILED",
  assignmentFetchFailed: "GRADES_ASSIGNMENT_FETCH_FAILED",
  submissionFetchFailed: "GRADES_SUBMISSION_FETCH_FAILED",
  courseNotFound: "GRADES_COURSE_NOT_FOUND",
  responseValidationFailed: "GRADES_RESPONSE_VALIDATION_FAILED",
  unknown: "GRADES_UNKNOWN_ERROR",
} as const;

export type GradesErrorCode =
  (typeof gradesErrorCodes)[keyof typeof gradesErrorCodes];

export type GradesServiceError = {
  code: GradesErrorCode;
  message: string;
};
