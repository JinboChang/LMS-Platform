export const operatorErrorCodes = {
  unauthorized: "operator/unauthorized",
  forbidden: "operator/forbidden",
  reportNotFound: "operator/report-not-found",
  invalidStatusTransition: "operator/invalid-status-transition",
  reportAlreadyResolved: "operator/report-already-resolved",
  actionTypeInvalid: "operator/action-type-invalid",
  repositoryError: "operator/repository-error",
  validationError: "operator/validation-error",
  metadataConflict: "operator/metadata-conflict",
  metadataNotFound: "operator/metadata-not-found",
} as const;

export type OperatorErrorCode = (typeof operatorErrorCodes)[keyof typeof operatorErrorCodes];

export type OperatorServiceError = OperatorErrorCode;

