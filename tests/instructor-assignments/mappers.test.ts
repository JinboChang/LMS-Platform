import { mapAssignmentListResponse } from '@/features/instructor-assignments/lib/mappers';
import type { AssignmentListResponse } from '@/features/instructor-assignments/lib/dto';

describe('mapAssignmentListResponse', () => {
  it('maps assignments to view model with derived fields', () => {
    const now = new Date().toISOString();

    const response: AssignmentListResponse = {
      assignments: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          courseId: '10000000-0000-0000-0000-000000000001',
          title: 'Project outline',
          description: 'Submit your proposal outline',
          dueAt: now,
          scoreWeight: 20,
          instructions: 'Provide a two-page outline.',
          submissionRequirements: 'Upload a PDF document.',
          lateSubmissionAllowed: true,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
          submissionStats: {
            total: 4,
            pending: 2,
            graded: 2,
            late: 1,
          },
        },
      ],
      statusCounts: {
        draft: 1,
        published: 0,
        closed: 0,
      },
    };

    const viewModel = mapAssignmentListResponse(response);

    expect(viewModel.statusCounts.draft).toBe(1);
    const [assignment] = viewModel.assignments;
    expect(assignment.statusLabel).toBe('Draft');
    expect(assignment.allowedTransitions).toEqual(['published']);
    expect(assignment.submissionStats.total).toBe(4);
    expect(assignment.dueDateLabel).toBeDefined();
  });
});
