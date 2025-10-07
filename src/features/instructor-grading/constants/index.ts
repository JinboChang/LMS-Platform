export const INSTRUCTOR_SUBMISSION_DETAIL_QUERY_KEY = (
  assignmentId: string,
  submissionId: string,
) => ['instructor', 'assignments', assignmentId, 'submissions', submissionId, 'detail'] as const;

export const INSTRUCTOR_GRADE_MUTATION_KEY = ['instructor', 'submissions', 'grade'] as const;
