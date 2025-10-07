import { z } from 'zod';
import { COURSE_STATUS_VALUES } from '@/features/instructor-courses/constants';

export const CourseStatusSchema = z.enum(COURSE_STATUS_VALUES);

export const CourseCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  isActive: z.boolean(),
});

export const DifficultyLevelSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  isActive: z.boolean(),
});

export const CourseTableRowSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  curriculum: z.string().min(1),
  category_id: z.string().uuid(),
  difficulty_id: z.string().uuid(),
  status: CourseStatusSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  category: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      is_active: z.boolean(),
    })
    .optional(),
  difficulty: z
    .object({
      id: z.string().uuid(),
      label: z.string().min(1),
      is_active: z.boolean(),
    })
    .optional(),
});

export const CourseListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  curriculum: z.string().min(1),
  categoryId: z.string().uuid(),
  categoryName: z.string().min(1),
  difficultyId: z.string().uuid(),
  difficultyLabel: z.string().min(1),
  status: CourseStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const CourseStatusCountsSchema = z.object({
  draft: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
  archived: z.number().int().nonnegative(),
});

export const CourseMetadataSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
    }),
  ),
  difficultyLevels: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string().min(1),
    }),
  ),
});

export const CourseListResponseSchema = z.object({
  courses: z.array(CourseListItemSchema),
  statusCounts: CourseStatusCountsSchema,
  metadata: CourseMetadataSchema,
});

export const CreateCourseRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().uuid(),
  difficultyId: z.string().uuid(),
  curriculum: z.string().min(1),
});

export const UpdateCourseRequestSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    categoryId: z.string().uuid().optional(),
    difficultyId: z.string().uuid().optional(),
    curriculum: z.string().min(1).optional(),
    status: CourseStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const ChangeCourseStatusRequestSchema = z.object({
  nextStatus: CourseStatusSchema,
});

export const CourseResponseSchema = z.object({
  course: CourseListItemSchema,
});

export type CourseStatus = z.infer<typeof CourseStatusSchema>;
export type CourseTableRow = z.infer<typeof CourseTableRowSchema>;
export type CourseListItem = z.infer<typeof CourseListItemSchema>;
export type CourseListResponse = z.infer<typeof CourseListResponseSchema>;
export type CourseStatusCounts = z.infer<typeof CourseStatusCountsSchema>;
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;
export type CreateCourseRequest = z.infer<typeof CreateCourseRequestSchema>;
export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequestSchema>;
export type ChangeCourseStatusRequest = z.infer<
  typeof ChangeCourseStatusRequestSchema
>;
export type CourseResponse = z.infer<typeof CourseResponseSchema>;
