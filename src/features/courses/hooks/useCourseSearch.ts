'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClientCourseListQuerySchema,
  ClientCourseListResponseSchema,
  type CourseListQueryDto,
} from '@/features/courses/lib/dto';
import { courseQueryKeys } from '@/features/courses/lib/query-keys';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { createAuthRequestConfig } from '@/lib/remote/get-auth-header';

type CourseSearchVariables = Partial<CourseListQueryDto>;

type UseCourseSearchOptions = {
  query: CourseSearchVariables;
  enabled?: boolean;
};

const fetchCourseList = async (params: CourseListQueryDto) => {
  try {
    const authConfig = await createAuthRequestConfig();
    const { data } = await apiClient.get('/api/courses', {
      params,
      ...authConfig,
    });
    return ClientCourseListResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      'Failed to fetch courses.',
    );
    throw new Error(message);
  }
};

export const useCourseSearch = ({
  query,
  enabled = true,
}: UseCourseSearchOptions) => {
  const parsedQuery = useMemo(() => {
    const sanitized = {
      ...query,
      search:
        typeof query.search === 'string' && query.search.trim().length > 0
          ? query.search.trim()
          : undefined,
      categoryId:
        typeof query.categoryId === 'string' && query.categoryId
          ? query.categoryId
          : undefined,
      difficultyId:
        typeof query.difficultyId === 'string' && query.difficultyId
          ? query.difficultyId
          : undefined,
      sort: query.sort ?? 'latest',
      limit: query.limit,
    } satisfies CourseSearchVariables;

    const result = ClientCourseListQuerySchema.safeParse(sanitized);

    return result.success ? result.data : null;
  }, [query]);

  return useQuery({
    queryKey: courseQueryKeys.list(parsedQuery ?? 'invalid'),
    queryFn: () => {
      if (!parsedQuery) {
        throw new Error('Search parameters are invalid.');
      }

      return fetchCourseList(parsedQuery);
    },
    enabled: Boolean(enabled && parsedQuery),
    staleTime: 30 * 1000,
  });
};
