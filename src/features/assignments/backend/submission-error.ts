export const assignmentSubmissionErrorCodes = {
  invalidParams: "INVALID_ASSIGNMENT_PARAMS",
  invalidPayload: "INVALID_ASSIGNMENT_SUBMISSION_PAYLOAD",
  learnerNotFound: "LEARNER_PROFILE_NOT_FOUND",
  notLearnerRole: "USER_NOT_LEARNER",
  assignmentNotFound: "ASSIGNMENT_NOT_FOUND",
  assignmentNotPublished: "ASSIGNMENT_NOT_OPEN",
  assignmentClosed: "ASSIGNMENT_CLOSED",
  enrollmentInactive: "ENROLLMENT_NOT_ACTIVE",
  lateNotAllowed: "LATE_SUBMISSION_NOT_ALLOWED",
  repositoryError: "ASSIGNMENT_SUBMISSION_PERSISTENCE_ERROR",
  unauthorized: "UNAUTHORIZED_ASSIGNMENT_SUBMISSION",
  unknown: "UNKNOWN_ASSIGNMENT_SUBMISSION_ERROR",
} as const;

export type AssignmentSubmissionErrorCode =
  (typeof assignmentSubmissionErrorCodes)[keyof typeof assignmentSubmissionErrorCodes];
