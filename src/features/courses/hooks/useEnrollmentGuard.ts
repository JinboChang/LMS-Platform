'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export type EnrollmentGuardState = {
  canEnroll: boolean;
  isAuthenticated: boolean;
  isLearner: boolean;
  isLoading: boolean;
  ensure: () => boolean;
};

const resolveRole = (userMetadata: Record<string, unknown>) => {
  const role = userMetadata.role;

  return typeof role === 'string' ? role : undefined;
};

export const useEnrollmentGuard = (): EnrollmentGuardState => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useCurrentUser();

  const role = useMemo(() => {
    const metadataRole = user ? resolveRole(user.userMetadata) : undefined;
    const appRole = user ? resolveRole(user.appMetadata) : undefined;
    return metadataRole ?? appRole ?? null;
  }, [user]);

  const isLearner = role === 'learner';

  const ensure = useCallback(() => {
    if (isLoading) {
      return false;
    }

    if (!isAuthenticated) {
      router.push('/login?redirectedFrom=/courses');
      return false;
    }

    if (!isLearner) {
      return false;
    }

    return true;
  }, [isAuthenticated, isLearner, isLoading, router]);

  return {
    canEnroll: Boolean(isAuthenticated && isLearner),
    isAuthenticated,
    isLearner,
    isLoading,
    ensure,
  };
};
