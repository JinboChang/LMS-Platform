export const REPORT_STATUSES = ["received", "investigating", "resolved"] as const;

export const REPORT_ACTION_TYPES = [
  "warning",
  "submission_invalidation",
  "account_suspension",
] as const;

export const REPORT_TARGET_TYPES = ["course", "assignment", "submission"] as const;

export const REPORT_STATUS_FLOW: Record<
  (typeof REPORT_STATUSES)[number],
  (typeof REPORT_STATUSES)[number][]
> = {
  received: ["investigating"],
  investigating: ["resolved"],
  resolved: [],
};

export const REPORT_STATUS_LABELS: Record<
  (typeof REPORT_STATUSES)[number],
  string
> = {
  received: "Received",
  investigating: "Investigating",
  resolved: "Resolved",
};

export const REPORT_ACTION_LABELS: Record<
  (typeof REPORT_ACTION_TYPES)[number],
  string
> = {
  warning: "Warning",
  submission_invalidation: "Submission invalidated",
  account_suspension: "Account suspended",
};

export const REPORT_TARGET_LABELS: Record<
  (typeof REPORT_TARGET_TYPES)[number],
  string
> = {
  course: "Course",
  assignment: "Assignment",
  submission: "Submission",
};

export const TABLE_NAMES = {
  reports: "reports",
  reportActions: "report_actions",
  courseCategories: "course_categories",
  difficultyLevels: "difficulty_levels",
  users: "users",
} as const;

export const OPERATOR_API_PATHS = {
  reports: "/api/operator/reports",
  reportActions: "/api/operator/reports/:reportId/actions",
  categories: "/api/operator/categories",
  difficultyLevels: "/api/operator/difficulty-levels",
} as const;

export const REPORTS_DEFAULT_PAGE_SIZE = 20;
export const REPORTS_MAX_PAGE_SIZE = 50;

export const CATEGORY_NAME_MIN_LENGTH = 2;
export const CATEGORY_NAME_MAX_LENGTH = 80;

export const DIFFICULTY_LABEL_MIN_LENGTH = 2;
export const DIFFICULTY_LABEL_MAX_LENGTH = 60;

export const REPORT_ACTION_NOTE_MIN_LENGTH = 2;
export const REPORT_ACTION_NOTE_MAX_LENGTH = 500;

export const REPORT_REASON_MAX_LENGTH = 500;
export const REPORT_DETAILS_MAX_LENGTH = 2000;

export const DEFAULT_CATEGORY_ACTIVE_STATE = true;
export const DEFAULT_DIFFICULTY_ACTIVE_STATE = true;
