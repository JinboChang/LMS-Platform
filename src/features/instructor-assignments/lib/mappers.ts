import { format, formatDistanceToNow } from 'date-fns';
import {
  AssignmentListResponseSchema,
  AssignmentResponseSchema,
  type AssignmentListItem,
  type AssignmentListResponse,
  type AssignmentResponse,
  type AssignmentStatus,
} from '@/features/instructor-assignments/lib/dto';

const ASSIGNMENT_STATUS_TRANSITIONS: Record<AssignmentStatus, readonly AssignmentStatus[]> = {
  draft: ['published'],
  published: ['closed'],
  closed: [],
};

const statusLabels: Record<AssignmentStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
};

const statusDescriptions: Record<AssignmentStatus, string> = {
  draft: 'Continue preparing before learners can view this assignment.',
  published: 'Visible to learners and accepting submissions.',
  closed: 'Submissions are closed. Continue grading as needed.',
};

const statusBadgeVariants: Record<AssignmentStatus, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'outline',
};

const formatDueDate = (isoDate: string) =>
  format(new Date(isoDate), 'MMM d, yyyy HH:mm');

const formatRelativeDueDate = (isoDate: string) =>
  formatDistanceToNow(new Date(isoDate), { addSuffix: true });

export type InstructorAssignmentSummary = AssignmentListItem & {
  statusLabel: string;
  statusDescription: string;
  statusBadgeVariant: 'default' | 'secondary' | 'outline';
  dueDateLabel: string;
  dueDateRelativeLabel: string;
  allowedTransitions: readonly AssignmentStatus[];
};

export type InstructorAssignmentListViewModel = {
  assignments: InstructorAssignmentSummary[];
  statusCounts: AssignmentListResponse['statusCounts'];
};

export const mapAssignmentListResponse = (
  response: AssignmentListResponse,
): InstructorAssignmentListViewModel => {
  const parsed = AssignmentListResponseSchema.parse(response);

  const assignments = parsed.assignments.map((assignment) => ({
    ...assignment,
    statusLabel: statusLabels[assignment.status],
    statusDescription: statusDescriptions[assignment.status],
    statusBadgeVariant: statusBadgeVariants[assignment.status],
    dueDateLabel: formatDueDate(assignment.dueAt),
    dueDateRelativeLabel: formatRelativeDueDate(assignment.dueAt),
    allowedTransitions: ASSIGNMENT_STATUS_TRANSITIONS[assignment.status],
  })) satisfies InstructorAssignmentSummary[];

  return {
    assignments,
    statusCounts: parsed.statusCounts,
  };
};

export const mapAssignmentResponse = (response: AssignmentResponse) =>
  AssignmentResponseSchema.parse(response);
