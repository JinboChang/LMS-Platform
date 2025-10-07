import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SubmissionDetailSchema,
  SubmissionStatusSchema,
  type SubmissionDetail,
} from '@/features/instructor-grading/backend/schema';

const SUBMISSIONS_TABLE = 'assignment_submissions';

const SubmissionCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  instructor_id: z.string().uuid(),
});

const SubmissionAssignmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  due_at: z.string(),
  course_id: z.string().uuid(),
  courses: SubmissionCourseSchema,
});

const SubmissionLearnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
});

const scorePreprocessor = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return value;
}, z.number().min(0).max(100).nullable());

const SubmissionRowSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  submission_text: z.string().nullable(),
  submission_link: z.string().nullable(),
  status: SubmissionStatusSchema,
  late: z.boolean(),
  score: scorePreprocessor,
  feedback_text: z.string().nullable(),
  submitted_at: z.string(),
  graded_at: z.string().nullable(),
  feedback_updated_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  assignments: SubmissionAssignmentSchema,
  learner: SubmissionLearnerSchema,
});

type SubmissionRow = z.infer<typeof SubmissionRowSchema>;

type UpdateSubmissionGradeParams = {
  status: SubmissionRow['status'];
  score: number;
  gradedAt: string;
  feedbackText: string | null;
  feedbackUpdatedAt: string | null;
};

const SUBMISSION_SELECT_FIELDS = `
  id,
  assignment_id,
  learner_id,
  submission_text,
  submission_link,
  status,
  late,
  score,
  feedback_text,
  submitted_at,
  graded_at,
  feedback_updated_at,
  created_at,
  updated_at,
  assignments!inner (
    id,
    title,
    due_at,
    course_id,
    courses!inner (
      id,
      title,
      instructor_id
    )
  ),
  learner:users!assignment_submissions_learner_id_fkey (
    id,
    name,
    email
  )
`;

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    const candidates = new Set<string>([trimmed]);

    if (!trimmed.includes('T')) {
      candidates.add(trimmed.replace(' ', 'T'));
    }

    if (!/[zZ]$/.test(trimmed) && !/[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      candidates.add(`${trimmed}Z`);
    }

    if (/[+-]\d{4}$/.test(trimmed)) {
      const base = trimmed.slice(0, -4);
      const hours = trimmed.slice(-4, -2);
      const minutes = trimmed.slice(-2);
      candidates.add(`${base}${hours}:${minutes}`);
    }

    for (const candidate of candidates) {
      const date = new Date(candidate);

      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return trimmed;
  }

  return null;
};

const normalizeSubmissionRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const assignments = row.assignments as Record<string, unknown> | undefined;

  return {
    ...row,
    score: scorePreprocessor.parse(row.score ?? (row as { score?: unknown }).score),
    submitted_at: toIsoString((row as { submitted_at?: unknown }).submitted_at) ??
      (row as { submitted_at?: unknown }).submitted_at,
    graded_at: toIsoString((row as { graded_at?: unknown }).graded_at),
    feedback_updated_at: toIsoString((row as { feedback_updated_at?: unknown }).feedback_updated_at),
    assignments: assignments
      ? {
          ...assignments,
          due_at: toIsoString(assignments.due_at) ?? assignments.due_at,
          courses: assignments.courses,
        }
      : assignments,
  };
};

const mapSubmissionRowToDetail = (row: SubmissionRow): SubmissionDetail => {
  const detail = {
    id: row.id,
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignments.title,
    assignmentDueAt: toIsoString(row.assignments.due_at) ?? row.assignments.due_at,
    courseId: row.assignments.course_id,
    courseTitle: row.assignments.courses.title,
    learner: {
      id: row.learner.id,
      name: row.learner.name,
      email: row.learner.email,
    },
    submissionText: row.submission_text,
    submissionLink: row.submission_link,
    status: row.status,
    late: row.late,
    score: row.score,
    feedbackText: row.feedback_text,
    requireResubmission: row.status === 'resubmission_required',
    submittedAt: toIsoString(row.submitted_at) ?? row.submitted_at,
    gradedAt: row.graded_at ? toIsoString(row.graded_at) ?? row.graded_at : null,
    feedbackUpdatedAt: row.feedback_updated_at
      ? toIsoString(row.feedback_updated_at) ?? row.feedback_updated_at
      : null,
  } satisfies SubmissionDetail;

  return SubmissionDetailSchema.parse(detail);
};

export const getSubmissionDetailForInstructor = async (
  client: SupabaseClient,
  assignmentId: string,
  submissionId: string,
  instructorId: string,
): Promise<SubmissionDetail | null> => {
  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select(SUBMISSION_SELECT_FIELDS)
    .eq('id', submissionId)
    .eq('assignment_id', assignmentId)
    .eq('assignments.courses.instructor_id', instructorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch submission.');
  }

  if (!data) {
    return null;
  }

  const parsed = SubmissionRowSchema.safeParse(
    normalizeSubmissionRow(data as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  return mapSubmissionRowToDetail(parsed.data);
};

export const updateSubmissionGrade = async (
  client: SupabaseClient,
  submissionId: string,
  { status, score, gradedAt, feedbackText, feedbackUpdatedAt }: UpdateSubmissionGradeParams,
): Promise<SubmissionDetail> => {
  const updatePayload: Record<string, unknown> = {
    status,
    score,
    graded_at: gradedAt,
    feedback_updated_at: feedbackUpdatedAt,
  };

  updatePayload.feedback_text = feedbackText;

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .update(updatePayload)
    .eq('id', submissionId)
    .select(SUBMISSION_SELECT_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message ?? 'Failed to update submission.');
  }

  const parsed = SubmissionRowSchema.safeParse(
    normalizeSubmissionRow(data as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  return mapSubmissionRowToDetail(parsed.data);
};
