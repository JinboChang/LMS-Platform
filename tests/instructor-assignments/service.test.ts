import { afterEach, describe, expect, it, vi } from 'vitest';
import { changeInstructorAssignmentStatus } from '@/features/instructor-assignments/backend/service';
import { instructorAssignmentsErrorCodes } from '@/features/instructor-assignments/backend/error';
import { fetchInstructorProfileByAuthId, fetchInstructorCourseById } from '@/features/instructor/common/repository';
import {
  getInstructorAssignment,
  updateInstructorAssignment,
} from '@/features/instructor-assignments/backend/repository';

vi.mock('@/features/instructor/common/repository', () => ({
  fetchInstructorProfileByAuthId: vi.fn(),
  fetchInstructorCourseById: vi.fn(),
}));

vi.mock('@/features/instructor-assignments/backend/repository', () => ({
  listInstructorAssignments: vi.fn(),
  createInstructorAssignment: vi.fn(),
  getInstructorAssignment: vi.fn(),
  updateInstructorAssignment: vi.fn(),
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
    vi.mocked(getInstructorAssignment).mockResolvedValue({
      id: 'assignment-id',
      courseId: 'course-id',
      title: 'Assignment',
      description: 'Description',
      dueAt: new Date().toISOString(),
      scoreWeight: 10,
      instructions: 'Instructions',
      submissionRequirements: 'Requirements',
      lateSubmissionAllowed: false,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissionStats: {
        total: 0,
        pending: 0,
        graded: 0,
        late: 0,
      },
      statusLabel: 'Published',
      statusDescription: '',
      statusBadgeVariant: 'default',
      dueDateLabel: '',
      dueDateRelativeLabel: '',
      allowedTransitions: ['closed'],
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
    vi.mocked(getInstructorAssignment).mockResolvedValue({
      id: 'assignment-id',
      courseId: 'course-id',
      title: '',
      description: '',
      dueAt: new Date().toISOString(),
      scoreWeight: 10,
      instructions: '',
      submissionRequirements: '',
      lateSubmissionAllowed: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissionStats: {
        total: 0,
        pending: 0,
        graded: 0,
        late: 0,
      },
      statusLabel: 'Draft',
      statusDescription: '',
      statusBadgeVariant: 'secondary',
      dueDateLabel: '',
      dueDateRelativeLabel: '',
      allowedTransitions: ['published'],
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
    }
  });

  it('updates status when transition is valid', async () => {
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
    vi.mocked(getInstructorAssignment).mockResolvedValue({
      id: 'assignment-id',
      courseId: 'course-id',
      title: 'Assignment',
      description: 'Description',
      dueAt: new Date().toISOString(),
      scoreWeight: 10,
      instructions: 'Instructions',
      submissionRequirements: 'Requirements',
      lateSubmissionAllowed: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissionStats: {
        total: 0,
        pending: 0,
        graded: 0,
        late: 0,
      },
      statusLabel: 'Draft',
      statusDescription: '',
      statusBadgeVariant: 'secondary',
      dueDateLabel: '',
      dueDateRelativeLabel: '',
      allowedTransitions: ['published'],
    });
    vi.mocked(updateInstructorAssignment).mockResolvedValue({
      assignment: {
        id: 'assignment-id',
        courseId: 'course-id',
        title: 'Assignment',
        description: 'Description',
        dueAt: new Date().toISOString(),
        scoreWeight: 10,
        instructions: 'Instructions',
        submissionRequirements: 'Requirements',
        lateSubmissionAllowed: false,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
    expect(updateInstructorAssignment).toHaveBeenCalledWith(
      client,
      'course-id',
      'assignment-id',
      { status: 'published' },
    );
    if (result.ok) {
      expect(result.data.assignment.status).toBe('published');
    }
  });
});
