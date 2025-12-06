import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { match } from 'ts-pattern';
import type {
  AssignmentDetail,
  AssignmentSubmission,
} from '@/features/assignments/backend/schema';

type SubmitActionState = {
  disabled: boolean;
  ctaLabel: string;
  helperText: string;
  tone: 'default' | 'warning' | 'destructive';
};

type SubmitActionInput = {
  canSubmit: boolean;
  isLate: boolean;
  assignmentStatus: AssignmentDetail['status'];
  submission: AssignmentSubmission | null;
  lateSubmissionAllowed: boolean;
};

export const formatDueDateTime = (dueAt: string) => {
  const parsed = parseISO(dueAt);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unable to parse due date.';
  }

  return format(parsed, 'yyyy-MM-dd HH:mm');
};

export const formatDueRelative = (dueAt: string) => {
  const parsed = parseISO(dueAt);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown due date';
  }

  return formatDistanceToNow(parsed, {
    addSuffix: true,
    locale: enUS,
  });
};

export const buildSubmissionStatusLabel = (
  submission: AssignmentSubmission | null,
) => {
  if (!submission) {
    return {
      label: 'No submission yet',
      tone: 'default' as const,
    };
  }

  return match(submission.status)
    .with('submitted', () => ({
      label: submission.late ? 'Submitted late' : 'Submitted',
      tone: submission.late ? ('warning' as const) : ('default' as const),
    }))
    .with('graded', () => ({
      label: 'Graded',
      tone: 'default' as const,
    }))
    .with('resubmission_required', () => ({
      label: 'Resubmission required',
      tone: 'warning' as const,
    }))
    .otherwise(() => ({
      label: 'Unknown status',
      tone: 'warning' as const,
    }));
};

export const resolveSubmitActionState = ({
  canSubmit,
  isLate,
  assignmentStatus,
  submission,
  lateSubmissionAllowed,
}: SubmitActionInput): SubmitActionState =>
  match({ canSubmit, isLate, assignmentStatus, submission, lateSubmissionAllowed })
    .with({ assignmentStatus: 'closed' }, () => ({
      disabled: true,
      ctaLabel: 'Submission closed',
      helperText: 'The submission window has ended.',
      tone: 'destructive' as const,
    }))
    .with({ canSubmit: false, isLate: true, lateSubmissionAllowed: false }, () => ({
      disabled: true,
      ctaLabel: 'Not available',
      helperText: 'Late submissions are not allowed after the deadline.',
      tone: 'destructive' as const,
    }))
    .with({ canSubmit: false }, () => ({
      disabled: true,
      ctaLabel: 'Not available',
      helperText: 'You cannot submit right now.',
      tone: 'destructive' as const,
    }))
    .with({ canSubmit: true, isLate: true }, ({ submission: currentSubmission }) => ({
      disabled: false,
      ctaLabel: currentSubmission ? 'Submit late resubmission' : 'Submit late',
      helperText: 'Submitting now will be marked as late.',
      tone: 'warning' as const,
    }))
    .with({ canSubmit: true }, ({ submission: currentSubmission }) => ({
      disabled: false,
      ctaLabel: currentSubmission ? 'Resubmit' : 'Submit',
      helperText: currentSubmission
        ? 'Your previous submission will be replaced.'
        : 'Review the requirements and submit.',
      tone: 'default' as const,
    }))
    .exhaustive();
