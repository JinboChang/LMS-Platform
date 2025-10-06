import { match } from 'ts-pattern';
import type { ExtendedEnrollmentStatusDto } from '@/features/courses/lib/dto';

export const isEnrollmentActive = (status: ExtendedEnrollmentStatusDto) =>
  status === 'active';

export const getEnrollmentStatusLabel = (
  status: ExtendedEnrollmentStatusDto,
): string =>
  match(status)
    .with('active', () => '수강 중')
    .with('cancelled', () => '취소됨')
    .with('none', () => '미신청')
    .exhaustive();
