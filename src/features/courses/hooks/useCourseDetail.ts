'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ClientCourseDetailSchema,
  type CourseDetailDto,
} from '@/features/courses/lib/dto';
import { courseQueryKeys } from '@/features/courses/lib/query-keys';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { createAuthRequestConfig } from '@/lib/remote/get-auth-header';

const fetchCourseDetail = async (courseId: string): Promise<CourseDetailDto> => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get(`/api/courses/${courseId}` , authConfig);
    return ClientCourseDetailSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '코스 상세 정보를 불러오지 못했습니다.',
    );
    throw new Error(message);
  }
};

export const useCourseDetail = (courseId: string | null) =>
  useQuery({
    queryKey: courseQueryKeys.detail(courseId ?? 'unknown'),
    queryFn: () => {
      if (!courseId) {
        throw new Error('코스 ID가 필요합니다.');
      }

      return fetchCourseDetail(courseId);
    },
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });
