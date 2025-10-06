import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
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
    return '마감일 정보를 불러올 수 없습니다.';
  }

  return format(parsed, 'yyyy-MM-dd HH:mm');
};

export const formatDueRelative = (dueAt: string) => {
  const parsed = parseISO(dueAt);

  if (Number.isNaN(parsed.getTime())) {
    return '알 수 없는 마감일';
  }

  return formatDistanceToNow(parsed, {
    addSuffix: true,
    locale: ko,
  });
};

export const buildSubmissionStatusLabel = (
  submission: AssignmentSubmission | null,
) => {
  if (!submission) {
    return {
      label: '제출 기록 없음',
      tone: 'default' as const,
    };
  }

  return match(submission.status)
    .with('submitted', () => ({
      label: submission.late ? '지각 제출 완료' : '제출 완료',
      tone: submission.late ? ('warning' as const) : ('default' as const),
    }))
    .with('graded', () => ({
      label: '채점 완료',
      tone: 'default' as const,
    }))
    .with('resubmission_required', () => ({
      label: '재제출 필요',
      tone: 'warning' as const,
    }))
    .otherwise(() => ({
      label: '알 수 없는 상태',
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
      ctaLabel: '제출 종료',
      helperText: '제출 기간이 종료된 과제입니다.',
      tone: 'destructive' as const,
    }))
    .with({ canSubmit: false, isLate: true, lateSubmissionAllowed: false }, () => ({
      disabled: true,
      ctaLabel: '제출 불가',
      helperText: '마감 시간이 지나 지각 제출이 허용되지 않습니다.',
      tone: 'destructive' as const,
    }))
    .with({ canSubmit: false }, () => ({
      disabled: true,
      ctaLabel: '제출 불가',
      helperText: '현재 제출할 수 없는 상태입니다.',
      tone: 'destructive' as const,
    }))
    .with({ canSubmit: true, isLate: true }, ({ submission: currentSubmission }) => ({
      disabled: false,
      ctaLabel: currentSubmission ? '지각 재제출' : '지각 제출',
      helperText: '지금 제출하면 지각으로 기록됩니다.',
      tone: 'warning' as const,
    }))
    .with({ canSubmit: true }, ({ submission: currentSubmission }) => ({
      disabled: false,
      ctaLabel: currentSubmission ? '재제출' : '제출하기',
      helperText: currentSubmission
        ? '재제출 시 기존 제출 내용이 대체됩니다.'
        : '요구사항을 확인하고 제출해 주세요.',
      tone: 'default' as const,
    }))
    .exhaustive();
