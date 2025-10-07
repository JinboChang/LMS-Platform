export const INSTRUCTOR_ASSIGNMENTS_QUERY_KEY = (
  courseId: string,
) => ['instructor', 'courses', courseId, 'assignments'] as const;
