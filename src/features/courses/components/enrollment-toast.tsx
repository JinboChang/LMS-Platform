'use client';

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useEnrollmentToast = () => {
  const { toast } = useToast();

  const showEnrollSuccess = useCallback((courseTitle: string) => {
    toast({
      title: '수강 신청 완료',
      description: `${courseTitle} 코스 수강 신청이 완료되었습니다.`,
    });
  }, [toast]);

  const showCancelSuccess = useCallback((courseTitle: string) => {
    toast({
      title: '수강 취소 완료',
      description: `${courseTitle} 코스 수강이 취소되었습니다.`,
    });
  }, [toast]);

  const showError = useCallback((message: string) => {
    toast({
      title: '요청 실패',
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
