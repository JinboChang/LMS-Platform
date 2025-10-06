import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export const formatProgressPercentage = (progress: number) => `${progress}%`;

export const formatDueDateTime = (isoString: string) =>
  format(parseISO(isoString), 'yyyy.MM.dd HH:mm', { locale: ko });

export const formatDueRelative = (isoString: string) =>
  formatDistanceToNowStrict(parseISO(isoString), {
    locale: ko,
    addSuffix: true,
  });

export const formatFeedbackTimestamp = (isoString: string) =>
  format(parseISO(isoString), 'yyyy.MM.dd HH:mm', { locale: ko });