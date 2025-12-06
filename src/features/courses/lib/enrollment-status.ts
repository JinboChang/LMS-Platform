import { match } from 'ts-pattern';
import type { ExtendedEnrollmentStatusDto } from '@/features/courses/lib/dto';

export const isEnrollmentActive = (status: ExtendedEnrollmentStatusDto) =>
  status === 'active';

export const getEnrollmentStatusLabel = (
  status: ExtendedEnrollmentStatusDto,
): string =>
  match(status)
    .with('active', () => 'Enrolled')
    .with('cancelled', () => 'Cancelled')
    .with('none', () => 'Not enrolled')
    .exhaustive();
