import { afterEach, describe, expect, it, vi } from 'vitest';
import { changeInstructorAssignmentStatus } from '@/features/instructor-assignments/backend/status-service';
import { instructorAssignmentsErrorCodes } from '@/features/instructor-assignments/backend/error';
import { fetchInstructorProfileByAuthId, fetchInstructorCourseById } from '@/features/instructor/common/repository';
import {
  getInstructorAssignment,
  updateInstructorAssignmentStatus,
} from '@/features/instructor-assignments/backend/repository';

vi.mock('@/features/instructor/common/repository', () => ({
  fetchInstructorProfileByAuthId: vi.fn(),
  fetchInstructorCourseById: vi.fn(),
}));

vi.mock('@/features/instructor-assignments/backend/repository', () => ({
  listInstructorAssignments: vi.fn(),
  createInstructorAssignment: vi.fn(),
  getInstructorAssignment: vi.fn(),
  updateInstructorAssignmentStatus: vi.fn(),
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
  vi.useRealTimers();
});

describe('changeInstructorAssignmentStatus', () => {
  it('returns failure for invalid transition', async () => {
    const client = createMockClient();

    vi.mocked(fetchInstructorProfileByAuthId).mockResolvedValue({
      instructorId: 'instructor-id',
      authUserId: 'auth-user-id',
    });
    vi.mocked(fetchInstructorCourseById).mockResolvedValue({
      id: 'course-id',
      instructor_id: 'instructor-id',
      title: 'Course',
    } as never);
    const now = new Date().toISOString();
    vi.mocked(getInstructorAssignment).mockResolvedValue({
      id: 'assignment-id',
      courseId: 'course-id',
      title: 'Assignment',
      description: 'Description',
      dueAt: now,
      scoreWeight: 10,
      instructions: 'Instructions',
      submissionRequirements: 'Requirements',
      lateSubmissionAllowed: false,
      status: 'published',
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      closedAt: null,
      submissionStats: {
        total: 0,
        pending: 0,
        graded: 0,
        late: 0,
      },
    });

    const result = await changeInstructorAssignmentStatus({
      client: client as unknown as MockClient as any,
      logger: console,
      courseId: 'course-id',
      assignmentId: 'assignment-id',
      accessToken: 'token',
      body: { nextStatus: 'draft' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.error.code).toBe(
        instructorAssignmentsErrorCodes.statusTransitionInvalid,
      );
    }
  });

  it('requires required fields before publishing', async () => {
    const client = createMockClient();

    vi.mocked(fetchInstructorProfileByAuthId).mockResolvedValue({
      instructorId: 'instructor-id',
      authUserId: 'auth-user-id',
    });
    vi.mocked(fetchInstructorCourseById).mockResolvedValue({
      id: 'course-id',
      instructor_id: 'instructor-id',
      title: 'Course',
    } as never);
    const now = new Date().toISOString();
    vi.mocked(getInstructorAssignment).mockResolvedValue({
      id: 'assignment-id',
      courseId: 'course-id',
      title: '',
      description: '',
      dueAt: now,
      scoreWeight: 10,
      instructions: '',
      submissionRequirements: '',
      lateSubmissionAllowed: false,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      closedAt: null,
      submissionStats: {
        total: 0,
        pending: 0,
        graded: 0,
        late: 0,
      },
    });

    const result = await changeInstructorAssignmentStatus({
      client: client as unknown as MockClient as any,
      logger: console,
      courseId: 'course-id',
      assignmentId: 'assignment-id',
      accessToken: 'token',
      body: { nextStatus: 'published' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.error.code).toBe(
        instructorAssignmentsErrorCodes.publishRequirementsIncomplete,
      );
    }
  });

  it('updates status when transition is valid', async () => {
    const client = createMockClient();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const expectedPublishedAt = new Date().toISOString();

    vi.mocked(fetchInstructorProfileByAuthId).mockResolvedValue({
      instructorId: 'instructor-id',
      authUserId: 'auth-user-id',
    });
    vi.mocked(fetchInstructorCourseById).mockResolvedValue({
      id: 'course-id',
      instructor_id: 'instructor-id',
      title: 'Course',
    } as never);
    const now = new Date().toISOString();
    vi.mocked(getInstructorAssignment).mockResolvedValue({
      id: 'assignment-id',
      courseId: 'course-id',
      title: 'Assignment',
      description: 'Description',
      dueAt: now,
      scoreWeight: 10,
      instructions: 'Instructions',
      submissionRequirements: 'Requirements',
      lateSubmissionAllowed: false,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      closedAt: null,
      submissionStats: {
        total: 0,
        pending: 0,
        graded: 0,
        late: 0,
      },
    });
    vi.mocked(updateInstructorAssignmentStatus).mockResolvedValue({
      assignment: {
        id: 'assignment-id',
        courseId: 'course-id',
        title: 'Assignment',
        description: 'Description',
        dueAt: now,
        scoreWeight: 10,
        instructions: 'Instructions',
        submissionRequirements: 'Requirements',
        lateSubmissionAllowed: false,
        status: 'published',
        createdAt: now,
        updatedAt: expectedPublishedAt,
        publishedAt: expectedPublishedAt,
        closedAt: null,
        submissionStats: {
          total: 0,
          pending: 0,
          graded: 0,
          late: 0,
        },
      },
    });

    const result = await changeInstructorAssignmentStatus({
      client: client as unknown as MockClient as any,
      logger: console,
      courseId: 'course-id',
      assignmentId: 'assignment-id',
      accessToken: 'token',
      body: { nextStatus: 'published' },
    });

    expect(result.ok).toBe(true);
    expect(updateInstructorAssignmentStatus).toHaveBeenCalledWith(
      client,
      'course-id',
      'assignment-id',
      { status: 'published', publishedAt: expectedPublishedAt, closedAt: null },
    );
    if (result.ok) {
      expect(result.data.status).toBe('published');
      expect(result.data.publishedAt).toBe(expectedPublishedAt);
      expect(result.data.closedAt).toBeNull();
    }
  });
});
