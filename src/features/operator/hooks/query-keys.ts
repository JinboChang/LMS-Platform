export const operatorQueryKeys = {
  base: ["operator"] as const,
  reports: (filters?: Record<string, unknown>) =>
    [
      "operator",
      "reports",
      filters ?? {},
    ] as const,
  reportDetail: (reportId: string) =>
    ["operator", "reports", reportId] as const,
  categories: ["operator", "categories"] as const,
  difficultyLevels: ["operator", "difficulty-levels"] as const,
};

