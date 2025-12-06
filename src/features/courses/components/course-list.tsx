'use client';

import { CourseCard } from '@/features/courses/components/course-card';
import type { CourseSummaryDto } from '@/features/courses/lib/dto';

export type CourseListProps = {
  courses: CourseSummaryDto[];
  isLoading?: boolean;
  enrollingCourseId?: string | null;
  cancellingEnrollmentId?: string | null;
  onSelectCourse: (courseId: string) => void;
  onEnrollCourse: (courseId: string) => void;
  onCancelEnrollment: (enrollmentId: string, courseId: string) => void;
};

const SkeletonCard = () => (
  <div className="h-full animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="h-40 w-full rounded-t-2xl bg-slate-200" />
    <div className="space-y-4 p-5">
      <div className="h-6 w-3/4 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-10 w-full rounded bg-slate-200" />
    </div>
  </div>
);

export const CourseList = ({
  courses,
  isLoading = false,
  enrollingCourseId,
  cancellingEnrollmentId,
  onSelectCourse,
  onEnrollCourse,
  onCancelEnrollment,
}: CourseListProps) => {
  if (isLoading && courses.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={`course-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (!isLoading && courses.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <p className="text-sm font-medium text-slate-600">No courses match your filters.</p>
        <p className="text-xs text-slate-500">Try changing the search keywords or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onSelect={onSelectCourse}
          onEnroll={onEnrollCourse}
          onCancel={onCancelEnrollment}
          enrollPending={enrollingCourseId === course.id}
          cancelPending={
            cancellingEnrollmentId !== null &&
            course.enrollment?.id === cancellingEnrollmentId
          }
        />
      ))}
    </div>
  );
};
