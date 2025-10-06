import { z } from 'zod';
import { CourseSortOrderSchema } from '@/features/courses/backend/schema';

export const CourseFilterFormSchema = z.object({
  search: z.string().trim().max(100).optional().or(z.literal('')),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  difficultyId: z.string().uuid().optional().or(z.literal('')),
  sort: CourseSortOrderSchema.default('latest'),
});

export type CourseFilterFormValues = z.infer<typeof CourseFilterFormSchema>;

export const createInitialCourseFilters = (): CourseFilterFormValues => ({
  search: '',
  categoryId: '',
  difficultyId: '',
  sort: 'latest',
});

export const serializeCourseFilters = (
  values: CourseFilterFormValues,
): Record<string, string> => {
  const payload: Record<string, string> = {};

  if (values.search && values.search.trim()) {
    payload.search = values.search.trim();
  }

  if (values.categoryId) {
    payload.categoryId = values.categoryId;
  }

  if (values.difficultyId) {
    payload.difficultyId = values.difficultyId;
  }

  payload.sort = values.sort;

  return payload;
};
