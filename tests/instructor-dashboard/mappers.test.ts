import {
  INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER,
  INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_DISPLAY_LIMIT,
} from '@/features/instructor-dashboard/constants';
import { mapInstructorDashboard } from '@/features/instructor-dashboard/lib/mappers';
import type { InstructorDashboardResponse } from '@/features/instructor-dashboard/lib/dto';

const makeUuid = (suffix: number) =>
  `00000000-0000-0000-0000-${suffix.toString().padStart(12, '0')}`;

describe('mapInstructorDashboard', () => {
  it('produces a view model with ordered buckets and enriched fields', () => {
    const now = new Date().toISOString();
    const recentItems = Array.from(
      { length: INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_DISPLAY_LIMIT + 5 },
      (_, index) => ({
        submissionId: makeUuid(index + 100),
        assignmentId: makeUuid(index + 200),
        assignmentTitle: `Assignment ${index + 1}`,
        courseId: makeUuid(1),
        courseTitle: 'Published Course',
        learnerId: makeUuid(index + 300),
        learnerName: `Learner ${index + 1}`,
        submittedAt: now,
        status: index % 2 === 0 ? 'graded' : 'submitted',
        late: index % 3 === 0,
        gradedAt: index % 2 === 0 ? now : null,
        score: index % 2 === 0 ? 95 : null,
        feedbackText: index % 2 === 0 ? 'Great work' : null,
      }),
    );

    const response: InstructorDashboardResponse = {
      courses: {
        totalCount: 2,
        buckets: {
          published: [
            {
              id: makeUuid(1),
              title: 'Published Course',
              status: 'published',
              assignmentCount: 3,
              pendingGradingCount: 2,
              updatedAt: now,
            },
          ],
          draft: [
            {
              id: makeUuid(2),
              title: 'Draft Course',
              status: 'draft',
              assignmentCount: 1,
              pendingGradingCount: 0,
              updatedAt: now,
            },
          ],
          archived: [],
        },
      },
      pendingGrading: [
        {
          submissionId: makeUuid(400),
          assignmentId: makeUuid(500),
          assignmentTitle: 'Essay draft',
          courseId: makeUuid(1),
          courseTitle: 'Published Course',
          learnerId: makeUuid(600),
          learnerName: 'Jordan Lee',
          submittedAt: now,
          status: 'submitted',
          late: false,
        },
      ],
      recentSubmissions: recentItems,
    };

    const viewModel = mapInstructorDashboard(response);

    expect(viewModel.totalCourseCount).toBe(2);
    expect(viewModel.courseBuckets).toHaveLength(3);
    expect(viewModel.courseBuckets[0]?.status).toBe('published');
    const [firstCourse] = viewModel.courseBuckets[0]?.courses ?? [];
    expect(firstCourse?.coverImageUrl).toContain(INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER);
    expect(viewModel.pendingGrading[0]?.assignmentLink).toContain(
      response.pendingGrading[0]?.assignmentId ?? '',
    );
    expect(viewModel.recentSubmissions).toHaveLength(
      INSTRUCTOR_DASHBOARD_RECENT_SUBMISSION_DISPLAY_LIMIT,
    );
    expect(viewModel.recentSubmissions[0]?.statusLabel).toBeDefined();
  });
});
