export const instructorGradingErrorCodes = {
  unauthorized: 'INSTRUCTOR_GRADING_UNAUTHORIZED',
  profileLookupFailed: 'INSTRUCTOR_GRADING_PROFILE_LOOKUP_FAILED',
  profileNotFound: 'INSTRUCTOR_GRADING_PROFILE_NOT_FOUND',
  submissionNotFound: 'INSTRUCTOR_GRADING_SUBMISSION_NOT_FOUND',
  forbidden: 'INSTRUCTOR_GRADING_FORBIDDEN',
  invalidParams: 'INSTRUCTOR_GRADING_INVALID_PARAMS',
  validationFailed: 'INSTRUCTOR_GRADING_VALIDATION_FAILED',
  invalidState: 'INSTRUCTOR_GRADING_INVALID_STATE',
  alreadyGraded: 'INSTRUCTOR_GRADING_ALREADY_GRADED',
  updateFailed: 'INSTRUCTOR_GRADING_UPDATE_FAILED',
  fetchFailed: 'INSTRUCTOR_GRADING_FETCH_FAILED',
} as const;

export type InstructorGradingErrorCode =
  (typeof instructorGradingErrorCodes)[keyof typeof instructorGradingErrorCodes];
