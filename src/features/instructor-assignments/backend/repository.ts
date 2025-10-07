import { z } from 'zod';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  AssignmentListItemSchema,
  AssignmentListResponseSchema,
  AssignmentResponseSchema,
  AssignmentTableRowSchema,
  AssignmentSubmissionAggregateSchema,
  type AssignmentListItem,
  type AssignmentListResponse,
  type AssignmentResponse,
  type AssignmentTableRow,
  type AssignmentSubmissionAggregate,
  type CreateAssignmentRequest,
  type UpdateAssignmentRequest,
} from '@/features/instructor-assignments/backend/schema';
import type { AssignmentStatus } from '@/features/instructor-assignments/backend/schema';

const ASSIGNMENTS_TABLE = 'assignments';
const SUBMISSIONS_TABLE = 'assignment_submissions';

const AssignmentRowsSchema = z.array(AssignmentTableRowSchema);
const SubmissionRowsSchema = z.array(
  z.object({
    assignment_id: z.string().uuid(),
    status: z.string(),
    late: z.boolean().nullable(),
  }),
);
const AssignmentWeightRowSchema = z.object({
  id: z.string().uuid(),
  score_weight: z.number(),
});
const AssignmentWeightRowsSchema = z.array(AssignmentWeightRowSchema);

const normalizeScoreWeight = (value: unknown) => {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue * 100) / 100;
};

const toWeightInteger = (value: number) => Math.round(value * 100);
const fromWeightInteger = (value: number) => value / 100;

const sumScoreWeightRows = (rows: Array<{ score_weight?: number | null }>) =>
  fromWeightInteger(
    rows.reduce((acc, row) => {
      const weight = typeof row.score_weight === "number" ? row.score_weight : 0;

      return acc + toWeightInteger(weight);
    }, 0),
  );

const normalizeTimestamp = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return value;
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
  }

  return value;
};

const coerceAssignmentRow = (row: Record<string, unknown>) => ({
  ...row,
  score_weight: normalizeScoreWeight(
    (row as { score_weight?: unknown }).score_weight,
  ),
  due_at: normalizeTimestamp((row as { due_at?: unknown }).due_at),
  created_at: normalizeTimestamp((row as { created_at?: unknown }).created_at),
  updated_at: normalizeTimestamp((row as { updated_at?: unknown }).updated_at),
  published_at: normalizeTimestamp((row as { published_at?: unknown }).published_at),
  closed_at: normalizeTimestamp((row as { closed_at?: unknown }).closed_at),
});

const isPostgrestError = (value: unknown): value is PostgrestError =>
  Boolean(value) &&
  typeof value === 'object' &&
  value !== null &&
  'code' in (value as Record<string, unknown>);

const throwIfTimelineColumnsMissing = (error: PostgrestError) => {
  if (error.code === '42703') {
    throw new Error(
      'Assignments schema missing published_at/closed_at columns. Apply migration 0007_add_assignment_status_timestamps.sql before retrying.',
    );
  }
};

const buildStatusCounts = (assignments: AssignmentTableRow[]) =>
  assignments.reduce(
    (acc, assignment) => {
      acc[assignment.status] += 1;
      return acc;
    },
    {
      draft: 0,
      published: 0,
      closed: 0,
    } as Record<AssignmentStatus, number>,
  );

const normalizeAssignment = (row: AssignmentTableRow): AssignmentListItem =>
  AssignmentListItemSchema.parse({
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    scoreWeight: row.score_weight,
    instructions: row.instructions,
    submissionRequirements: row.submission_requirements,
    lateSubmissionAllowed: row.late_submission_allowed,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: (row as { published_at?: string | null }).published_at ?? null,
    closedAt: (row as { closed_at?: string | null }).closed_at ?? null,
    submissionStats: {
      total: 0,
      pending: 0,
      graded: 0,
      late: 0,
    },
  });

const aggregateSubmissionStats = (
  rows: { assignment_id: string; status: string; late: boolean | null }[],
): AssignmentSubmissionAggregate[] => {
  const stats = new Map<string, AssignmentSubmissionAggregate>();

  rows.forEach((row) => {
    const current =
      stats.get(row.assignment_id) ?? {
        assignment_id: row.assignment_id,
        total_count: 0,
        pending_count: 0,
        graded_count: 0,
        late_count: 0,
      } satisfies AssignmentSubmissionAggregate;

    current.total_count += 1;

    if (row.status === 'submitted' || row.status === 'resubmission_required') {
      current.pending_count += 1;
    }

    if (row.status === 'graded') {
      current.graded_count += 1;
    }

    if (row.late) {
      current.late_count += 1;
    }

    stats.set(row.assignment_id, current);
  });

  return Array.from(stats.values()).map((aggregate) =>
    AssignmentSubmissionAggregateSchema.parse(aggregate),
  );
};

const fetchSubmissionAggregates = async (
  client: SupabaseClient,
  assignmentIds: readonly string[],
) => {
  if (assignmentIds.length === 0) {
    return [] as AssignmentSubmissionAggregate[];
  }

  const { data, error } = await client
    .from(SUBMISSIONS_TABLE)
    .select('assignment_id, status, late')
    .in('assignment_id', assignmentIds);

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch assignment submissions.');
  }

  const submissionRows = SubmissionRowsSchema.safeParse(data ?? []);

  if (!submissionRows.success) {
    throw submissionRows.error;
  }

  return aggregateSubmissionStats(
    submissionRows.data as {
      assignment_id: string;
      status: string;
      late: boolean | null;
    }[],
  );
};

const mapSubmissionAggregates = (
  assignments: AssignmentListItem[],
  aggregates: AssignmentSubmissionAggregate[],
) => {
  const aggregateByAssignment = new Map<string, AssignmentSubmissionAggregate>();

  aggregates.forEach((aggregate) => {
    aggregateByAssignment.set(aggregate.assignment_id, aggregate);
  });

  return assignments.map((assignment) => {
    const aggregate = aggregateByAssignment.get(assignment.id);

    if (!aggregate) {
      return assignment;
    }

    return {
      ...assignment,
      submissionStats: {
        total: aggregate.total_count,
        pending: aggregate.pending_count,
        graded: aggregate.graded_count,
        late: aggregate.late_count,
      },
    } satisfies AssignmentListItem;
  });
};

export const listInstructorAssignments = async (
  client: SupabaseClient,
  courseId: string,
): Promise<AssignmentListResponse> => {
  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .select(
      'id, course_id, title, description, due_at, score_weight, instructions, submission_requirements, late_submission_allowed, status, created_at, updated_at, published_at, closed_at',
    )
    .eq('course_id', courseId)
    .order('due_at', { ascending: true });

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch assignments.');
  }

  const parsedRows = AssignmentRowsSchema.safeParse(
    (data ?? []).map((row) => coerceAssignmentRow(row as Record<string, unknown>)),
  );

  if (!parsedRows.success) {
    throw parsedRows.error;
  }

  const assignments = parsedRows.data.map(normalizeAssignment);
  const aggregates = await fetchSubmissionAggregates(
    client,
    assignments.map((assignment) => assignment.id),
  );

  const assignmentsWithStats = mapSubmissionAggregates(assignments, aggregates);
  const statusCounts = buildStatusCounts(parsedRows.data) as AssignmentListResponse['statusCounts'];

  return AssignmentListResponseSchema.parse({
    assignments: assignmentsWithStats,
    statusCounts,
  });
};

export const getInstructorAssignment = async (
  client: SupabaseClient,
  courseId: string,
  assignmentId: string,
): Promise<AssignmentListItem | null> => {
  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .select(
      'id, course_id, title, description, due_at, score_weight, instructions, submission_requirements, late_submission_allowed, status, created_at, updated_at, published_at, closed_at',
    )
    .eq('course_id', courseId)
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch assignment.');
  }

  if (!data) {
    return null;
  }

  const parsed = AssignmentTableRowSchema.safeParse(
    coerceAssignmentRow(data as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  const assignment = normalizeAssignment(parsed.data);
  const [aggregate] = await fetchSubmissionAggregates(client, [assignmentId]);

  if (!aggregate) {
    return assignment;
  }

  return mapSubmissionAggregates([assignment], [aggregate])[0];
};

export const createInstructorAssignment = async (
  client: SupabaseClient,
  courseId: string,
  payload: CreateAssignmentRequest,
): Promise<AssignmentResponse> => {
  const insertPayload = {
    course_id: courseId,
    title: payload.title,
    description: payload.description,
    due_at: payload.dueAt,
    score_weight: payload.scoreWeight,
    instructions: payload.instructions,
    submission_requirements: payload.submissionRequirements,
    late_submission_allowed: payload.lateSubmissionAllowed,
    status: 'draft',
  } as const;

  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .insert(insertPayload)
    .select(
      'id, course_id, title, description, due_at, score_weight, instructions, submission_requirements, late_submission_allowed, status, created_at, updated_at, published_at, closed_at',
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create assignment.');
  }

  const parsed = AssignmentTableRowSchema.safeParse(
    coerceAssignmentRow(data as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  const assignment = normalizeAssignment(parsed.data);

  return AssignmentResponseSchema.parse({
    assignment,
  });
};

type AssignmentWeightOptions = {
  excludeAssignmentId?: string;
};

export const getCourseAssignmentScoreWeightTotal = async (
  client: SupabaseClient,
  courseId: string,
  options: AssignmentWeightOptions = {},
): Promise<number> => {
  let query = client
    .from(ASSIGNMENTS_TABLE)
    .select('id, score_weight')
    .eq('course_id', courseId);

  if (options.excludeAssignmentId) {
    query = query.neq('id', options.excludeAssignmentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch assignment score weights.');
  }

  const parsed = AssignmentWeightRowsSchema.safeParse(
    (data ?? []).map((row) => ({
      id: row.id,
      score_weight: normalizeScoreWeight(
        (row as { score_weight?: unknown }).score_weight,
      ),
    })),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  return sumScoreWeightRows(parsed.data);
};

type FindAssignmentByTitleOptions = {
  excludeAssignmentId?: string;
};

export const findInstructorAssignmentByTitle = async (
  client: SupabaseClient,
  courseId: string,
  title: string,
  options: FindAssignmentByTitleOptions = {},
): Promise<AssignmentTableRow | null> => {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    return null;
  }

  let query = client
    .from(ASSIGNMENTS_TABLE)
    .select(
      'id, course_id, title, description, due_at, score_weight, instructions, submission_requirements, late_submission_allowed, status, created_at, updated_at, published_at, closed_at',
    )
    .eq('course_id', courseId)
    .eq('title', normalizedTitle)
    .order('created_at', { ascending: false })
    .limit(1);

  if (options.excludeAssignmentId) {
    query = query.neq('id', options.excludeAssignmentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? 'Failed to verify assignment title.');
  }

  const [row] = data ?? [];

  if (!row) {
    return null;
  }

  const parsed = AssignmentTableRowSchema.safeParse(
    coerceAssignmentRow(row as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
};

type UpdateAssignmentStatusPayload = {
  status: AssignmentStatus;
  publishedAt?: string | null;
  closedAt?: string | null;
};

export const updateInstructorAssignmentStatus = async (
  client: SupabaseClient,
  courseId: string,
  assignmentId: string,
  payload: UpdateAssignmentStatusPayload,
): Promise<AssignmentResponse> => {
  const updatePayload: Record<string, unknown> = {
    status: payload.status,
  };

  if (payload.publishedAt !== undefined) {
    updatePayload.published_at = payload.publishedAt;
  }

  if (payload.closedAt !== undefined) {
    updatePayload.closed_at = payload.closedAt;
  }

  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .update(updatePayload)
    .eq('course_id', courseId)
    .eq('id', assignmentId)
    .select(
      'id, course_id, title, description, due_at, score_weight, instructions, submission_requirements, late_submission_allowed, status, created_at, updated_at, published_at, closed_at',
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to update assignment status.');
  }

  const parsed = AssignmentTableRowSchema.safeParse(
    coerceAssignmentRow(data as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  const [aggregate] = await fetchSubmissionAggregates(client, [assignmentId]);
  const assignment = mapSubmissionAggregates(
    [normalizeAssignment(parsed.data)],
    aggregate ? [aggregate] : [],
  )[0];

  return AssignmentResponseSchema.parse({
    assignment,
  });
};

export const updateInstructorAssignment = async (
  client: SupabaseClient,
  courseId: string,
  assignmentId: string,
  payload: UpdateAssignmentRequest,
): Promise<AssignmentResponse> => {
  const updatePayload: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    updatePayload.title = payload.title;
  }

  if (payload.description !== undefined) {
    updatePayload.description = payload.description;
  }

  if (payload.dueAt !== undefined) {
    updatePayload.due_at = payload.dueAt;
  }

  if (payload.scoreWeight !== undefined) {
    updatePayload.score_weight = payload.scoreWeight;
  }

  if (payload.instructions !== undefined) {
    updatePayload.instructions = payload.instructions;
  }

  if (payload.submissionRequirements !== undefined) {
    updatePayload.submission_requirements = payload.submissionRequirements;
  }

  if (payload.lateSubmissionAllowed !== undefined) {
    updatePayload.late_submission_allowed = payload.lateSubmissionAllowed;
  }

  if (payload.status !== undefined) {
    updatePayload.status = payload.status;
  }

  const { data, error } = await client
    .from(ASSIGNMENTS_TABLE)
    .update(updatePayload)
    .eq('course_id', courseId)
    .eq('id', assignmentId)
    .select(
      'id, course_id, title, description, due_at, score_weight, instructions, submission_requirements, late_submission_allowed, status, created_at, updated_at, published_at, closed_at',
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to update assignment.');
  }

  const parsed = AssignmentTableRowSchema.safeParse(
    coerceAssignmentRow(data as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw parsed.error;
  }

  const [aggregate] = await fetchSubmissionAggregates(client, [assignmentId]);
  const assignment = mapSubmissionAggregates(
    [normalizeAssignment(parsed.data)],
    aggregate ? [aggregate] : [],
  )[0];

  return AssignmentResponseSchema.parse({
    assignment,
  });
};
