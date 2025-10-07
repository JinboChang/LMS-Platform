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
  received: "접수됨",
  investigating: "조사 중",
  resolved: "처리 완료",
};

export const REPORT_ACTION_LABELS: Record<
  (typeof REPORT_ACTION_TYPES)[number],
  string
> = {
  warning: "경고",
  submission_invalidation: "제출 무효화",
  account_suspension: "계정 제한",
};

export const REPORT_TARGET_LABELS: Record<
  (typeof REPORT_TARGET_TYPES)[number],
  string
> = {
  course: "코스",
  assignment: "과제",
  submission: "제출물",
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
