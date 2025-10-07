import { mapCourseListResponse } from '@/features/instructor-courses/lib/mappers';
import type { CourseListResponse } from '@/features/instructor-courses/lib/dto';
import { DEFAULT_PICSUM_IMAGE_PROVIDER } from '@/features/instructor/common/constants';

describe('mapCourseListResponse', () => {
  it('maps raw course list response to view model', () => {
    const now = new Date().toISOString();

    const response: CourseListResponse = {
      courses: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          title: 'TypeScript Deep Dive',
          description: 'Master TypeScript generics.',
          curriculum: 'Module 1: Fundamentals',
          categoryId: '10000000-0000-0000-0000-000000000001',
          categoryName: 'Programming',
          difficultyId: '20000000-0000-0000-0000-000000000001',
          difficultyLabel: 'Intermediate',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        },
      ],
      statusCounts: {
        draft: 1,
        published: 0,
        archived: 0,
      },
      metadata: {
        categories: [
          {
            id: '10000000-0000-0000-0000-000000000001',
            name: 'Programming',
          },
        ],
        difficultyLevels: [
          {
            id: '20000000-0000-0000-0000-000000000001',
            label: 'Intermediate',
          },
        ],
      },
    };

    const viewModel = mapCourseListResponse(response);

    expect(viewModel.courses).toHaveLength(1);
    const [course] = viewModel.courses;
    expect(course.statusLabel).toBe('Draft');
    expect(course.coverImageUrl).toContain(DEFAULT_PICSUM_IMAGE_PROVIDER);
    expect(course.allowedTransitions).toEqual(['published']);
    expect(viewModel.metadata.categories[0]?.name).toBe('Programming');
  });
});
