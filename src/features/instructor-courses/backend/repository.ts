import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type {
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseListItem,
} from '@/features/instructor-courses/backend/schema';
import {
  CourseListItemSchema,
  CourseListResponseSchema,
  CourseStatusCountsSchema,
  CourseTableRowSchema,
  CourseMetadataSchema,
} from '@/features/instructor-courses/backend/schema';
import {
  fetchActiveCategories,
  fetchActiveDifficultyLevels,
} from '@/features/courses/backend/repository';

const COURSES_TABLE = 'courses';

const CourseRowsSchema = z.array(CourseTableRowSchema);

type Supabase = SupabaseClient;

type UpsertPayload = {
  title?: string;
  description?: string;
  category_id?: string;
  difficulty_id?: string;
  curriculum?: string;
  status?: string;
};

type CourseStatusCountsInput = {
  draft: number;
  published: number;
  archived: number;
};

const normalizeCourseRow = (row: z.infer<typeof CourseTableRowSchema>): CourseListItem => ({
  id: row.id,
  title: row.title,
  description: row.description,
  curriculum: row.curriculum,
  categoryId: row.category_id,
  categoryName: row.category?.name ?? row.category_id,
  difficultyId: row.difficulty_id,
  difficultyLabel: row.difficulty?.label ?? row.difficulty_id,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const buildCourseList = (rows: z.infer<typeof CourseTableRowSchema>[]) =>
  rows.map(normalizeCourseRow);

const buildStatusCounts = (rows: z.infer<typeof CourseTableRowSchema>[]) => {
  const counts: CourseStatusCountsInput = {
    draft: 0,
    published: 0,
    archived: 0,
  };

  rows.forEach((row) => {
    counts[row.status] += 1;
  });

  return CourseStatusCountsSchema.parse(counts);
};

export const listCoursesByInstructor = async (
  client: Supabase,
  instructorId: string,
) => {
  const { data, error } = await client
    .from(COURSES_TABLE)
    .select(
      `
        id,
        instructor_id,
        title,
        description,
        curriculum,
        category_id,
        difficulty_id,
        status,
        created_at,
        updated_at,
        category:course_categories ( id, name, is_active ),
        difficulty:difficulty_levels ( id, label, is_active )
      `,
    )
    .eq('instructor_id', instructorId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch instructor courses.');
  }

  const parsed = CourseRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    throw parsed.error;
  }

  const courses = buildCourseList(parsed.data);
  const statusCounts = buildStatusCounts(parsed.data);

  const [activeCategories, activeDifficultyLevels] = await Promise.all([
    fetchActiveCategories(client),
    fetchActiveDifficultyLevels(client),
  ]);

  const metadata = CourseMetadataSchema.parse({
    categories: activeCategories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    difficultyLevels: activeDifficultyLevels.map((difficulty) => ({
      id: difficulty.id,
      label: difficulty.label,
    })),
  });

  return CourseListResponseSchema.parse({
    courses,
    statusCounts,
    metadata,
  });
};

export const getCourseById = async (
  client: Supabase,
  instructorId: string,
  courseId: string,
): Promise<CourseListItem | null> => {
  const { data, error } = await client
    .from(COURSES_TABLE)
    .select(
      `
        id,
        instructor_id,
        title,
        description,
        curriculum,
        category_id,
        difficulty_id,
        status,
        created_at,
        updated_at,
        category:course_categories ( id, name, is_active ),
        difficulty:difficulty_levels ( id, label, is_active )
      `,
    )
    .eq('id', courseId)
    .eq('instructor_id', instructorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch course.');
  }

  if (!data) {
    return null;
  }

  const parsed = CourseTableRowSchema.safeParse(data);

  if (!parsed.success) {
    throw parsed.error;
  }

  const normalized = normalizeCourseRow(parsed.data);

  return CourseListItemSchema.parse(normalized);
};

export const createCourse = async (
  client: Supabase,
  instructorId: string,
  payload: CreateCourseRequest,
): Promise<CourseListItem> => {
  const insertPayload = {
    instructor_id: instructorId,
    title: payload.title,
    description: payload.description,
    category_id: payload.categoryId,
    difficulty_id: payload.difficultyId,
    curriculum: payload.curriculum,
    status: 'draft',
  } as const;

  const { data, error } = await client
    .from(COURSES_TABLE)
    .insert(insertPayload)
    .select(
      `
        id,
        instructor_id,
        title,
        description,
        curriculum,
        category_id,
        difficulty_id,
        status,
        created_at,
        updated_at,
        category:course_categories ( id, name, is_active ),
        difficulty:difficulty_levels ( id, label, is_active )
      `,
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create course.');
  }

  const parsed = CourseTableRowSchema.safeParse(data);

  if (!parsed.success) {
    throw parsed.error;
  }

  return CourseListItemSchema.parse(normalizeCourseRow(parsed.data));
};

export const updateCourse = async (
  client: Supabase,
  instructorId: string,
  courseId: string,
  payload: UpdateCourseRequest,
): Promise<CourseListItem> => {
  const updatePayload: UpsertPayload = {};

  if (payload.title !== undefined) {
    updatePayload.title = payload.title;
  }

  if (payload.description !== undefined) {
    updatePayload.description = payload.description;
  }

  if (payload.categoryId !== undefined) {
    updatePayload.category_id = payload.categoryId;
  }

  if (payload.difficultyId !== undefined) {
    updatePayload.difficulty_id = payload.difficultyId;
  }

  if (payload.curriculum !== undefined) {
    updatePayload.curriculum = payload.curriculum;
  }

  if (payload.status !== undefined) {
    updatePayload.status = payload.status;
  }

  const { data, error } = await client
    .from(COURSES_TABLE)
    .update(updatePayload)
    .eq('id', courseId)
    .eq('instructor_id', instructorId)
    .select(
      `
        id,
        instructor_id,
        title,
        description,
        curriculum,
        category_id,
        difficulty_id,
        status,
        created_at,
        updated_at,
        category:course_categories ( id, name, is_active ),
        difficulty:difficulty_levels ( id, label, is_active )
      `,
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update course.');
  }

  const parsed = CourseTableRowSchema.safeParse(data);

  if (!parsed.success) {
    throw parsed.error;
  }

  return CourseListItemSchema.parse(normalizeCourseRow(parsed.data));
};
