import { afterEach, describe, expect, it, vi } from 'vitest';
import { changeInstructorCourseStatus } from '@/features/instructor-courses/backend/service';
import { fetchInstructorProfileByAuthId } from '@/features/instructor/common/repository';
import { getCourseById, updateCourse } from '@/features/instructor-courses/backend/repository';

vi.mock('@/features/instructor/common/repository', () => ({
  fetchInstructorProfileByAuthId: vi.fn(),
}));

vi.mock('@/features/instructor-courses/backend/repository', () => ({
  getCourseById: vi.fn(),
  updateCourse: vi.fn(),
}));

type MockClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
};

const createMockClient = (): MockClient => ({
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })),
  },
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('changeInstructorCourseStatus', () => {
  it('rejects invalid status transitions', async () => {
    const client = createMockClient();
    vi.mocked(fetchInstructorProfileByAuthId).mockResolvedValue({
      instructorId: 'instructor-id',
      authUserId: 'auth-user-id',
    });
    vi.mocked(getCourseById).mockResolvedValue({
      id: 'course-id',
      title: 'Course',
      description: 'Desc',
      curriculum: 'Curriculum',
      categoryId: 'cat-id',
      categoryName: 'Category',
      difficultyId: 'diff-id',
      difficultyLabel: 'Diff',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await changeInstructorCourseStatus({
      client: client as unknown as MockClient as any,
      logger: console,
      accessToken: 'token',
      courseId: 'course-id',
      body: { nextStatus: 'draft' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });

  it('prevents publishing when required fields are missing', async () => {
    const client = createMockClient();
    vi.mocked(fetchInstructorProfileByAuthId).mockResolvedValue({
      instructorId: 'instructor-id',
      authUserId: 'auth-user-id',
    });
    vi.mocked(getCourseById).mockResolvedValue({
      id: 'course-id',
      title: 'Course',
      description: '',
      curriculum: 'Curriculum',
      categoryId: 'cat-id',
      categoryName: 'Category',
      difficultyId: 'diff-id',
      difficultyLabel: 'Diff',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await changeInstructorCourseStatus({
      client: client as unknown as MockClient as any,
      logger: console,
      accessToken: 'token',
      courseId: 'course-id',
      body: { nextStatus: 'published' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });

  it('updates status successfully when validation passes', async () => {
    const client = createMockClient();
    vi.mocked(fetchInstructorProfileByAuthId).mockResolvedValue({
      instructorId: 'instructor-id',
      authUserId: 'auth-user-id',
    });
    vi.mocked(getCourseById).mockResolvedValue({
      id: 'course-id',
      title: 'Course',
      description: 'Desc',
      curriculum: 'Curriculum',
      categoryId: 'cat-id',
      categoryName: 'Category',
      difficultyId: 'diff-id',
      difficultyLabel: 'Diff',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(updateCourse).mockResolvedValue({
      id: 'course-id',
      title: 'Course',
      description: 'Desc',
      curriculum: 'Curriculum',
      categoryId: 'cat-id',
      categoryName: 'Category',
      difficultyId: 'diff-id',
      difficultyLabel: 'Diff',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await changeInstructorCourseStatus({
      client: client as unknown as MockClient as any,
      logger: console,
      accessToken: 'token',
      courseId: 'course-id',
      body: { nextStatus: 'published' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.course.status).toBe('published');
    }
  });
});
