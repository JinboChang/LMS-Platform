import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  CourseCategoryRowSchema,
  CourseListRowSchema,
  DifficultyLevelRowSchema,
  EnrollmentRowSchema,
  LearnerProfileRowSchema,
  type CourseCategory,
  type CourseCategoryRow,
  type CourseListQuery,
  type CourseListRow,
  type DifficultyLevel,
  type DifficultyLevelRow,
  type EnrollmentRow,
} from './schema';

const COURSES_TABLE = 'courses';
const CATEGORIES_TABLE = 'course_categories';
const DIFFICULTY_TABLE = 'difficulty_levels';
const USERS_TABLE = 'users';
const ENROLLMENTS_TABLE = 'enrollments';

const escapeLikePattern = (input: string) =>
  input.replace(/[%_]/g, (match) => `\\${match}`);

const parseRows = <T>(rows: unknown[], schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: unknown } }) => {
  const parsed: T[] = [];

  rows.forEach((row) => {
    const result = schema.safeParse(row);

    if (result.success) {
      parsed.push(result.data);
    }
  });

  return parsed;
};

export const fetchActiveCategories = async (
  client: SupabaseClient,
): Promise<CourseCategory[]> => {
  const { data, error } = await client
    .from(CATEGORIES_TABLE)
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return parseRows<CourseCategoryRow>(data, CourseCategoryRowSchema);
};

export const fetchActiveDifficultyLevels = async (
  client: SupabaseClient,
): Promise<DifficultyLevel[]> => {
  const { data, error } = await client
    .from(DIFFICULTY_TABLE)
    .select('id, label, is_active')
    .eq('is_active', true)
    .order('label', { ascending: true });

  if (error || !data) {
    return [];
  }

  return parseRows<DifficultyLevelRow>(data, DifficultyLevelRowSchema);
};

export const fetchCourseList = async (
  client: SupabaseClient,
  query: CourseListQuery,
): Promise<{ data: CourseListRow[]; error: PostgrestError | null }> => {
  const fetchLimit = Math.min(query.limit * 3, 60);
  let builder = client
    .from(COURSES_TABLE)
    .select(
      `
        id,
        title,
        description,
        curriculum,
        status,
        created_at,
        updated_at,
        instructor:users!courses_instructor_id_fkey(id, name),
        category:course_categories!inner(id, name, is_active),
        difficulty:difficulty_levels!inner(id, label, is_active)
      `,
    )
    .eq('status', 'published')
    .eq('category.is_active', true)
    .eq('difficulty.is_active', true);

  if (query.categoryId) {
    builder = builder.eq('category_id', query.categoryId);
  }

  if (query.difficultyId) {
    builder = builder.eq('difficulty_id', query.difficultyId);
  }

  if (query.search) {
    const pattern = `%${escapeLikePattern(query.search)}%`;
    builder = builder.or(
      `title.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  builder = builder.order('created_at', { ascending: false }).limit(fetchLimit);

  const { data, error } = await builder;

  if (error || !data) {
    return { data: [], error: error ?? null };
  }

  return { data: parseRows<CourseListRow>(data, CourseListRowSchema), error: null };
};

export const fetchCourseById = async (
  client: SupabaseClient,
  courseId: string,
) => {
  const { data, error } = await client
    .from(COURSES_TABLE)
    .select(
      `
        id,
        title,
        description,
        curriculum,
        status,
        created_at,
        updated_at,
        instructor:users!courses_instructor_id_fkey(id, name),
        category:course_categories!inner(id, name, is_active),
        difficulty:difficulty_levels!inner(id, label, is_active)
      `,
    )
    .eq('id', courseId)
    .eq('category.is_active', true)
    .eq('difficulty.is_active', true)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error ?? null };
  }

  const parsed = CourseListRowSchema.safeParse(data);

  if (!parsed.success) {
    return { data: null, error: null };
  }

  return { data: parsed.data, error: null };
};

export const fetchLearnerProfile = async (
  client: SupabaseClient,
  authUserId: string,
) => {
  const { data, error } = await client
    .from(USERS_TABLE)
    .select('id, auth_user_id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error ?? null };
  }

  const parsed = LearnerProfileRowSchema.safeParse(data);

  if (!parsed.success) {
    return { data: null, error: null };
  }

  return { data: parsed.data, error: null };
};

export const fetchEnrollmentsByCourseIds = async (
  client: SupabaseClient,
  learnerId: string,
  courseIds: string[],
) => {
  if (courseIds.length === 0) {
    return [] as EnrollmentRow[];
  }

  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select('id, course_id, learner_id, status, updated_at')
    .eq('learner_id', learnerId)
    .in('course_id', courseIds);

  if (error || !data) {
    return [] as EnrollmentRow[];
  }

  return parseRows<EnrollmentRow>(data, EnrollmentRowSchema);
};

export const fetchEnrollmentById = async (
  client: SupabaseClient,
  enrollmentId: string,
) => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select('id, course_id, learner_id, status, updated_at')
    .eq('id', enrollmentId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error ?? null };
  }

  const parsed = EnrollmentRowSchema.safeParse(data);

  if (!parsed.success) {
    return { data: null, error: null };
  }

  return { data: parsed.data, error: null };
};

export const fetchEnrollmentByCourse = async (
  client: SupabaseClient,
  learnerId: string,
  courseId: string,
) => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select('id, course_id, learner_id, status, updated_at')
    .eq('learner_id', learnerId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error ?? null };
  }

  const parsed = EnrollmentRowSchema.safeParse(data);

  if (!parsed.success) {
    return { data: null, error: null };
  }

  return { data: parsed.data, error: null };
};

export const insertEnrollment = async (
  client: SupabaseClient,
  learnerId: string,
  courseId: string,
) => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .insert({ learner_id: learnerId, course_id: courseId })
    .select('id, course_id, learner_id, status, updated_at')
    .single();

  if (error || !data) {
    return { data: null, error: error ?? null };
  }

  const parsed = EnrollmentRowSchema.safeParse(data);

  if (!parsed.success) {
    return { data: null, error: null };
  }

  return { data: parsed.data, error: null };
};

export const updateEnrollmentStatus = async (
  client: SupabaseClient,
  enrollmentId: string,
  status: 'active' | 'cancelled',
) => {
  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .update({ status })
    .eq('id', enrollmentId)
    .select('id, course_id, learner_id, status, updated_at')
    .single();

  if (error || !data) {
    return { data: null, error: error ?? null };
  }

  const parsed = EnrollmentRowSchema.safeParse(data);

  if (!parsed.success) {
    return { data: null, error: null };
  }

  return { data: parsed.data, error: null };
};

export const fetchActiveEnrollmentCounts = async (
  client: SupabaseClient,
  courseIds: string[],
) => {
  if (courseIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await client
    .from(ENROLLMENTS_TABLE)
    .select('course_id, status')
    .in('course_id', courseIds)
    .eq('status', 'active');

  if (error || !data) {
    return new Map<string, number>();
  }

  return data.reduce((acc, row) => {
    const courseId = row.course_id as string | undefined;

    if (!courseId) {
      return acc;
    }

    const current = acc.get(courseId) ?? 0;
    acc.set(courseId, current + 1);
    return acc;
  }, new Map<string, number>());
};
