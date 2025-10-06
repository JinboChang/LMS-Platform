export const assignmentErrorCodes = {
  enrollmentNotFound: 'ASSIGNMENT_ENROLLMENT_NOT_FOUND',
  assignmentNotFound: 'ASSIGNMENT_NOT_FOUND',
  assignmentNotAccessible: 'ASSIGNMENT_NOT_ACCESSIBLE',
  repositoryError: 'ASSIGNMENT_REPOSITORY_ERROR',
  validationError: 'ASSIGNMENT_VALIDATION_ERROR',
  unauthorized: 'ASSIGNMENT_UNAUTHORIZED',
  learnerProfileNotFound: 'ASSIGNMENT_LEARNER_PROFILE_NOT_FOUND',
} as const;

type AssignmentErrorValue =
  (typeof assignmentErrorCodes)[keyof typeof assignmentErrorCodes];

export type AssignmentServiceError = AssignmentErrorValue;
