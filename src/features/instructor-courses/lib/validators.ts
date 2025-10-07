import { z } from 'zod';

export const CourseFormSchema = z.object({
  title: z.string().trim().min(1, 'Course title is required.'),
  description: z.string().trim().min(1, 'Course description is required.'),
  categoryId: z.string().uuid('Select a valid category.'),
  difficultyId: z.string().uuid('Select a valid difficulty level.'),
  curriculum: z.string().trim().min(1, 'Curriculum outline is required.'),
});

export type CourseFormValues = z.infer<typeof CourseFormSchema>;
