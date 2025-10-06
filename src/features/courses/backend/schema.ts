import { z } from 'zod';

const nullishToUndefined = <T>(value: T) => {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 'undefined' ||
    value === 'null'
  ) {
    return undefined;
  }

  return value;
};

export const CourseStatusSchema = z.enum(['draft', 'published', 'archived']);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

export const EnrollmentStatusSchema = z.enum(['active', 'cancelled']);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

export const ExtendedEnrollmentStatusSchema = EnrollmentStatusSchema.or(
  z.literal('none'),
);
export type ExtendedEnrollmentStatus = z.infer<
  typeof ExtendedEnrollmentStatusSchema
>;

export const CourseSortOrderSchema = z.enum(['latest', 'popular']);
export type CourseSortOrder = z.infer<typeof CourseSortOrderSchema>;

const sanitizeSearch = (value: unknown) => {
  const normalized = nullishToUndefined(value);

  if (typeof normalized !== 'string') {
    return undefined;
  }

  const trimmed = normalized.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeUuid = (value: unknown) => {
  const normalized = nullishToUndefined(value);

  if (typeof normalized !== 'string') {
    return undefined;
  }

  return normalized;
};

const sanitizeLimit = (value: unknown) => {
  const normalized = nullishToUndefined(value);

  if (typeof normalized === 'number') {
    return normalized;
  }

  if (typeof normalized === 'string') {
    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export const CourseListQuerySchema = z
  .object({
    search: z
      .preprocess(sanitizeSearch, z.string().min(2).max(100))
      .optional(),
    categoryId: z
      .preprocess(sanitizeUuid, z.string().uuid('?좏슚??移댄뀒怨좊━ ID媛 ?꾩슂?⑸땲??'))
      .optional(),
    difficultyId: z
      .preprocess(
        sanitizeUuid,
        z.string().uuid('?좏슚???쒖씠??ID媛 ?꾩슂?⑸땲??'),
      )
      .optional(),
    sort: z
      .preprocess(nullishToUndefined, CourseSortOrderSchema)
      .default('latest'),
    limit: z
      .preprocess(sanitizeLimit, z.number().int().positive().max(50))
      .default(12),
  })
  .transform((value) => ({
    ...value,
    limit: Math.min(Math.max(value.limit, 1), 50),
  }));

export type CourseListQuery = z.infer<typeof CourseListQuerySchema>;

export const CourseParamsSchema = z.object({ id: z.string().uuid() });
export type CourseParams = z.infer<typeof CourseParamsSchema>;

export const EnrollmentParamsSchema = z.object({ id: z.string().uuid() });
export type EnrollmentParams = z.infer<typeof EnrollmentParamsSchema>;

export const EnrollmentRequestSchema = z.object({
  courseId: z.string().uuid(),
});
export type EnrollmentRequest = z.infer<typeof EnrollmentRequestSchema>;

export const EnrollmentUpdateSchema = z.object({
  status: z.literal('cancelled'),
});
export type EnrollmentUpdate = z.infer<typeof EnrollmentUpdateSchema>;

export const CourseCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});
export type CourseCategory = z.infer<typeof CourseCategorySchema>;

export const DifficultyLevelSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
});
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const SortOptionSchema = z.object({
  value: CourseSortOrderSchema,
  label: z.string().min(1),
});
export type SortOption = z.infer<typeof SortOptionSchema>;

export const EnrollmentSnapshotSchema = z.object({
  id: z.string().uuid(),
  status: EnrollmentStatusSchema,
  updatedAt: z.string(),
});
export type EnrollmentSnapshot = z.infer<typeof EnrollmentSnapshotSchema>;

export const CourseSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string().min(1),
  thumbnailUrl: z.string().url(),
  category: CourseCategorySchema,
  difficulty: DifficultyLevelSchema,
  instructor: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  activeEnrollmentCount: z.number().int().nonnegative(),
  enrollment: EnrollmentSnapshotSchema.nullable(),
  enrollmentStatus: ExtendedEnrollmentStatusSchema,
  isEnrolled: z.boolean(),
});
export type CourseSummary = z.infer<typeof CourseSummarySchema>;

export const CourseDetailSchema = CourseSummarySchema.extend({
  description: z.string().min(1),
  curriculum: z.string().min(1),
  status: CourseStatusSchema,
});
export type CourseDetail = z.infer<typeof CourseDetailSchema>;

export const CourseListResponseSchema = z.object({
  items: z.array(CourseSummarySchema),
  filters: z.object({
    categories: z.array(CourseCategorySchema),
    difficultyLevels: z.array(DifficultyLevelSchema),
    sortOptions: z.array(SortOptionSchema),
  }),
});
export type CourseListResponse = z.infer<typeof CourseListResponseSchema>;

export const EnrollmentResponseSchema = z.object({
  enrollment: EnrollmentSnapshotSchema,
  courseId: z.string().uuid(),
});
export type EnrollmentResponse = z.infer<typeof EnrollmentResponseSchema>;

export const LearnerProfileRowSchema = z.object({
  id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  role: z.literal('learner'),
});
export type LearnerProfileRow = z.infer<typeof LearnerProfileRowSchema>;

export const CourseCategoryRowSchema = CourseCategorySchema.extend({
  is_active: z.boolean().optional(),
});
export type CourseCategoryRow = z.infer<typeof CourseCategoryRowSchema>;

export const DifficultyLevelRowSchema = DifficultyLevelSchema.extend({
  is_active: z.boolean().optional(),
});
export type DifficultyLevelRow = z.infer<typeof DifficultyLevelRowSchema>;

export const CourseListRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  curriculum: z.string(),
  status: CourseStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  instructor: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
    })
    .nullable(),
  category: CourseCategoryRowSchema.nullable(),
  difficulty: DifficultyLevelRowSchema.nullable(),
});
export type CourseListRow = z.infer<typeof CourseListRowSchema>;

export const EnrollmentRowSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  learner_id: z.string().uuid(),
  status: EnrollmentStatusSchema,
  updated_at: z.string(),
});
export type EnrollmentRow = z.infer<typeof EnrollmentRowSchema>;
