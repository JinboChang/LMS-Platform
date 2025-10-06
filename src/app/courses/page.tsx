'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { CourseFilters } from '@/features/courses/components/course-filters';
import { CourseList } from '@/features/courses/components/course-list';
import { CourseDetailSheet } from '@/features/courses/components/course-detail-sheet';
import { useCourseSearch } from '@/features/courses/hooks/useCourseSearch';
import { useCourseDetail } from '@/features/courses/hooks/useCourseDetail';
import { useEnrollmentMutation } from '@/features/courses/hooks/useEnrollmentMutation';
import { useEnrollmentGuard } from '@/features/courses/hooks/useEnrollmentGuard';
import { useEnrollmentToast } from '@/features/courses/components/enrollment-toast';
import {
  createInitialCourseFilters,
  serializeCourseFilters,
  type CourseFilterFormValues,
} from '@/features/courses/lib/filter-options';
import { Toaster } from '@/components/ui/toaster';

type CoursesPageProps = {
  params: Promise<Record<string, never>>;
};

const DEFAULT_PAGE_SIZE = 12;

export default function CoursesPage({ params }: CoursesPageProps) {
  void params;
  const [filters, setFilters] = useState<CourseFilterFormValues>(
    createInitialCourseFilters(),
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const guard = useEnrollmentGuard();
  const { showEnrollSuccess, showCancelSuccess, showError } = useEnrollmentToast();

  const queryPayload = useMemo(() => {
    const serialized = serializeCourseFilters(filters);

    return {
      search: serialized.search,
      categoryId: serialized.categoryId,
      difficultyId: serialized.difficultyId,
      sort: filters.sort,
      limit: DEFAULT_PAGE_SIZE,
    };
  }, [filters]);

  const courseQuery = useCourseSearch({ query: queryPayload });
  const { enrollMutation, cancelMutation } = useEnrollmentMutation();
  const courseDetailQuery = useCourseDetail(sheetOpen ? selectedCourseId : null);

  const enrollingCourseId = enrollMutation.isPending
    ? enrollMutation.variables?.courseId ?? null
    : null;
  const cancellingEnrollmentId = cancelMutation.isPending
    ? cancelMutation.variables?.enrollmentId ?? null
    : null;

  const handleFilterSubmit = useCallback((values: CourseFilterFormValues) => {
    setFilters(values);
  }, []);

  const findCourseTitle = useCallback(
    (courseId: string) =>
      courseQuery.data?.items.find((course) => course.id === courseId)?.title ??
      courseDetailQuery.data?.title ??
      '선택한 코스',
    [courseDetailQuery.data?.title, courseQuery.data?.items],
  );

  const handleSelectCourse = useCallback((courseId: string) => {
    setSelectedCourseId(courseId);
    setSheetOpen(true);
  }, []);

  const handleEnrollCourse = useCallback(
    async (courseId: string) => {
      if (!guard.ensure()) {
        return;
      }

      try {
        const response = await enrollMutation.mutateAsync({ courseId });
        showEnrollSuccess(findCourseTitle(response.courseId));
      } catch (error) {
        showError(error instanceof Error ? error.message : '신청에 실패했습니다.');
      }
    },
    [enrollMutation, findCourseTitle, guard, showEnrollSuccess, showError],
  );

  const handleCancelEnrollment = useCallback(
    async (enrollmentId: string, courseId: string) => {
      if (!guard.ensure()) {
        return;
      }

      try {
        const response = await cancelMutation.mutateAsync({
          enrollmentId,
          courseId,
        });
        showCancelSuccess(findCourseTitle(response.courseId));
      } catch (error) {
        showError(error instanceof Error ? error.message : '취소에 실패했습니다.');
      }
    },
    [cancelMutation, findCourseTitle, guard, showCancelSuccess, showError],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-4 text-slate-900">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400">
            Courses
          </span>
          <h1 className="text-3xl font-bold">코스 카탈로그</h1>
          <p className="text-sm text-slate-500">
            검색어와 필터를 조합해 원하는 코스를 찾아보고, 바로 수강 신청하거나 취소할 수 있습니다.
          </p>
        </div>
      </header>

      <CourseFilters
        filters={courseQuery.data?.filters ?? null}
        defaultValues={filters}
        isSubmitting={courseQuery.isPending}
        onSubmit={handleFilterSubmit}
      />

      {courseQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {courseQuery.error instanceof Error
            ? courseQuery.error.message
            : '코스 목록을 불러오는 중 오류가 발생했습니다.'}
        </div>
      ) : null}

      <CourseList
        courses={courseQuery.data?.items ?? []}
        isLoading={courseQuery.isPending}
        enrollingCourseId={enrollingCourseId}
        cancellingEnrollmentId={cancellingEnrollmentId}
        onSelectCourse={handleSelectCourse}
        onEnrollCourse={handleEnrollCourse}
        onCancelEnrollment={handleCancelEnrollment}
      />

      <CourseDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        course={courseDetailQuery.data ?? null}
        enrollmentGuard={guard}
        onEnroll={handleEnrollCourse}
        onCancel={handleCancelEnrollment}
        enrollPending={enrollMutation.isPending}
        cancelPending={cancelMutation.isPending}
      />

      {courseDetailQuery.isError ? (
        <p className="text-xs text-rose-500">
          {courseDetailQuery.error instanceof Error
            ? courseDetailQuery.error.message
            : '코스 상세 정보를 불러오는 중 오류가 발생했습니다.'}
        </p>
      ) : null}

      <footer className="mt-auto flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span>
          총 {courseQuery.data?.items.length ?? 0}개의 코스가 검색되었습니다.
        </span>
        <div className="flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          <span>필터를 조정해 더 많은 코스를 탐색하세요.</span>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
