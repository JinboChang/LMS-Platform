export const courseQueryKeys = {
  all: ['courses'] as const,
  list: (params: unknown) => ['courses', 'list', params] as const,
  detail: (courseId: string) => ['courses', 'detail', courseId] as const,
  filters: ['courses', 'filters'] as const,
};

export const enrollmentQueryKeys = {
  all: ['enrollments'] as const,
  course: (courseId: string) => ['enrollments', courseId] as const,
};
