'use client';

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useEnrollmentToast = () => {
  const { toast } = useToast();

  const showEnrollSuccess = useCallback((courseTitle: string) => {
    toast({
      title: 'Enrollment successful',
      description: `Enrollment confirmed for ${courseTitle}.`,
    });
  }, [toast]);

  const showCancelSuccess = useCallback((courseTitle: string) => {
    toast({
      title: 'Enrollment cancelled',
      description: `Enrollment for ${courseTitle} has been cancelled.`,
    });
  }, [toast]);

  const showError = useCallback((message: string) => {
    toast({
      title: 'Request failed',
      description: message,
      variant: 'destructive',
    });
  }, [toast]);

  return {
    showEnrollSuccess,
    showCancelSuccess,
    showError,
  };
};
