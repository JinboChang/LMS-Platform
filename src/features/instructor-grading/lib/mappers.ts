import { format, formatDistanceToNow } from 'date-fns';
import type { SubmissionDetail } from '@/features/instructor-grading/lib/dto';

const statusLabels: Record<SubmissionDetail['status'], string> = {
  submitted: 'Awaiting review',
  graded: 'Graded',
  resubmission_required: 'Resubmission requested',
};

const statusDescriptions: Record<SubmissionDetail['status'], string> = {
  submitted: 'This submission has not been graded yet.',
  graded: 'You provided a score and feedback for this submission.',
  resubmission_required: 'Learner must address the feedback and resubmit.',
};

const statusBadgeVariants: Record<SubmissionDetail['status'], 'default' | 'secondary' | 'destructive'> = {
  submitted: 'secondary',
  graded: 'default',
  resubmission_required: 'destructive',
};

export type SubmissionDetailViewModel = SubmissionDetail & {
  statusLabel: string;
  statusDescription: string;
  statusBadgeVariant: 'default' | 'secondary' | 'destructive';
  submittedAtLabel: string;
  submittedAtRelative: string;
  gradedAtLabel: string | null;
};

const formatDateTime = (isoDate: string) => format(new Date(isoDate), 'MMM d, yyyy HH:mm');

const formatRelative = (isoDate: string) =>
  formatDistanceToNow(new Date(isoDate), { addSuffix: true });

export const mapSubmissionDetail = (
  detail: SubmissionDetail,
): SubmissionDetailViewModel => ({
  ...detail,
  statusLabel: statusLabels[detail.status],
  statusDescription: statusDescriptions[detail.status],
  statusBadgeVariant: statusBadgeVariants[detail.status],
  submittedAtLabel: formatDateTime(detail.submittedAt),
  submittedAtRelative: formatRelative(detail.submittedAt),
  gradedAtLabel: detail.gradedAt ? formatDateTime(detail.gradedAt) : null,
});
