'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClientEnrollmentResponseSchema,
  type EnrollmentRequestDto,
} from '@/features/courses/lib/dto';
import {
  courseQueryKeys,
  enrollmentQueryKeys,
} from '@/features/courses/lib/query-keys';
import { enrollmentErrorCodes } from '@/features/courses/backend/error';
import {
  apiClient,
  extractApiErrorMessage,
  isAxiosError,
} from '@/lib/remote/api-client';
import { createAuthRequestConfig } from '@/lib/remote/get-auth-header';

const parseEnrollmentError = (error: unknown) => {
  if (isAxiosError(error)) {
    const payload = error.response?.data as {
      error?: {
        code?: string;
        message?: string;
      };
    } | null;

    const code = payload?.error?.code;

    if (typeof code === 'string') {
      if (code === enrollmentErrorCodes.duplicateEnrollment) {
        return 'You are already enrolled in this course.';
      }

      if (code === enrollmentErrorCodes.enrollmentNotFound) {
        return 'Enrollment could not be found.';
      }

      if (code === enrollmentErrorCodes.unauthorized) {
        return 'Please sign in to continue.';
      }
    }

    if (typeof payload?.error?.message === 'string') {
      return payload.error.message;
    }
  }

  return extractApiErrorMessage(error, 'Failed to update enrollment.');
};

type EnrollVariables = EnrollmentRequestDto;

type CancelVariables = {
  enrollmentId: string;
  courseId: string;
};

export const useEnrollmentMutation = () => {
  const queryClient = useQueryClient();

  const invalidateCourse = useCallback(
    async (courseId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: courseQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: courseQueryKeys.detail(courseId) }),
        queryClient.invalidateQueries({ queryKey: enrollmentQueryKeys.course(courseId) }),
      ]);
    },
    [queryClient],
  );

  const enrollMutation = useMutation({
    mutationFn: async (variables: EnrollVariables) => {
      try {
        const authConfig = await createAuthRequestConfig();

        if (!authConfig.headers?.Authorization) {
          throw new Error('Authorization header is missing. Please sign in.');
        }

        const { data } = await apiClient.post(
          '/api/enrollments',
          variables,
          authConfig,
        );
        return ClientEnrollmentResponseSchema.parse(data);
      } catch (error) {
        throw new Error(parseEnrollmentError(error));
      }
    },
    onSuccess: async (data) => {
      await invalidateCourse(data.courseId);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (variables: CancelVariables) => {
      try {
        const authConfig = await createAuthRequestConfig();

        if (!authConfig.headers?.Authorization) {
          throw new Error('Authorization header is missing. Please sign in.');
        }

        const { data } = await apiClient.patch(
          `/api/enrollments/${variables.enrollmentId}`,
          { status: 'cancelled' },
          authConfig,
        );
        const parsed = ClientEnrollmentResponseSchema.parse(data);
        return parsed;
      } catch (error) {
        throw new Error(parseEnrollmentError(error));
      }
    },
    onSuccess: async (data) => {
      await invalidateCourse(data.courseId);
    },
  });

  return {
    enrollMutation,
    cancelMutation,
  };
};
