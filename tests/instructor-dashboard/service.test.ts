import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInstructorDashboard } from '@/features/instructor-dashboard/backend/service';
import {
  fetchAssignmentsForCourses,
  fetchInstructorCourses,
  fetchPendingSubmissionsForInstructor,
  fetchSubmissionsForInstructor,
} from '@/features/instructor-dashboard/backend/repository';
import { instructorDashboardErrorCodes } from '@/features/instructor-dashboard/backend/error';

vi.mock('@/features/instructor-dashboard/backend/repository', () => ({
  fetchInstructorCourses: vi.fn(),
  fetchAssignmentsForCourses: vi.fn(),
  fetchPendingSubmissionsForInstructor: vi.fn(),
  fetchSubmissionsForInstructor: vi.fn(),
}));

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockClient = {} as SupabaseClient;

const baseSubmission = {
  id: '70000000-0000-0000-0000-000000000001',
  assignment_id: '80000000-0000-0000-0000-000000000001',
  learner_id: '90000000-0000-0000-0000-000000000001',
  status: 'submitted' as const,
  late: false,
  score: null,
  feedback_text: null,
  submitted_at: new Date().toISOString(),
  graded_at: null as string | null,
  feedback_updated_at: null as string | null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignments: {
    id: '80000000-0000-0000-0000-000000000001',
    title: 'Project proposal',
    course_id: '20000000-0000-0000-0000-000000000001',
    due_at: new Date().toISOString(),
    courses: {
      id: '20000000-0000-0000-0000-000000000001',
      title: 'Published Course',
      instructor_id: 'instructor-0000-0000-0000-000000000001',
    },
  },
  learner: {
    id: '90000000-0000-0000-0000-000000000001',
    name: 'Jordan Lee',
  },
};

function buildSubmission(
  overrides: Partial<typeof baseSubmission> & {
    assignments?: Partial<typeof baseSubmission.assignments> & {
      courses?: Partial<typeof baseSubmission.assignments.courses>;
    };
    learner?: Partial<typeof baseSubmission.learner>;
  } = {},
) {
  return {
    ...baseSubmission,
    ...overrides,
    assignments: {
      ...baseSubmission.assignments,
      ...(overrides.assignments ?? {}),
      courses: {
        ...baseSubmission.assignments.courses,
        ...(overrides.assignments?.courses ?? {}),
      },
    },
    learner: {
      ...baseSubmission.learner,
      ...(overrides.learner ?? {}),
    },
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('getInstructorDashboard', () => {
  it('returns aggregated dashboard data on success', async () => {
    const now = new Date().toISOString();

    vi.mocked(fetchInstructorCourses).mockResolvedValue([
      {
        id: '20000000-0000-0000-0000-000000000001',
        title: 'Published Course',
        status: 'published',
        assignmentCount: 0,
        pendingGradingCount: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        title: 'Draft Course',
        status: 'draft',
        assignmentCount: 0,
        pendingGradingCount: 0,
        created_at: now,
        updated_at: now,
      },
    ]);

    vi.mocked(fetchAssignmentsForCourses).mockResolvedValue([
      {
        id: '80000000-0000-0000-0000-000000000001',
        course_id: '20000000-0000-0000-0000-000000000001',
        title: 'Project proposal',
        status: 'published',
        due_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);

    vi.mocked(fetchPendingSubmissionsForInstructor).mockResolvedValue([
      buildSubmission(),
    ]);

    vi.mocked(fetchSubmissionsForInstructor).mockResolvedValue([
      buildSubmission({
        id: '71000000-0000-0000-0000-000000000001',
        status: 'graded',
        score: 92,
        graded_at: now,
        feedback_text: 'Excellent',
      }),
    ]);

    const result = await getInstructorDashboard({
      client: mockClient,
      logger: mockLogger,
      instructorId: 'instructor-0000-0000-0000-000000000001',
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.ok && result.data.courses.totalCount).toBe(2);
    expect(result.ok && result.data.courses.buckets.published[0]?.pendingGradingCount).toBe(1);
    expect(result.ok && result.data.pendingGrading).toHaveLength(1);
    expect(result.ok && result.data.recentSubmissions[0]?.status).toBe('graded');
  });

  it('returns failure when course fetch throws', async () => {
    const error = new Error('query failed');
    vi.mocked(fetchInstructorCourses).mockRejectedValue(error);

    const result = await getInstructorDashboard({
      client: mockClient,
      logger: mockLogger,
      instructorId: 'instructor-0000-0000-0000-000000000001',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error.code).toBe(instructorDashboardErrorCodes.courseFetchFailed);
    }
  });
});
