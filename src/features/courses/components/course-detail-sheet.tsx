'use client';

import Image from 'next/image';
import { Calendar, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { CourseDetailDto } from '@/features/courses/lib/dto';
import { getEnrollmentStatusLabel } from '@/features/courses/lib/enrollment-status';
import type { EnrollmentGuardState } from '@/features/courses/hooks/useEnrollmentGuard';

export type CourseDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseDetailDto | null;
  enrollmentGuard: EnrollmentGuardState;
  onEnroll: (courseId: string) => void;
  onCancel: (enrollmentId: string, courseId: string) => void;
  enrollPending?: boolean;
  cancelPending?: boolean;
};

export const CourseDetailSheet = ({
  open,
  onOpenChange,
  course,
  enrollmentGuard,
  onEnroll,
  onCancel,
  enrollPending = false,
  cancelPending = false,
}: CourseDetailSheetProps) => {
  const enrollmentId = course?.enrollment?.id ?? null;
  const isEnrolled = Boolean(
    course?.enrollmentStatus === 'active' && enrollmentId,
  );

  const handleAction = () => {
    if (!course) {
      return;
    }

    if (isEnrolled && enrollmentId) {
      onCancel(enrollmentId, course.id);
      return;
    }

    if (!enrollmentGuard.ensure()) {
      return;
    }

    onEnroll(course.id);
  };

  const actionLabel = isEnrolled
    ? cancelPending
      ? 'Cancelling...'
      : 'Cancel enrollment'
    : enrollPending
      ? 'Enrolling...'
      : 'Enroll now';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
        {course ? (
          <div className="flex flex-col gap-6">
            <SheetHeader className="items-start space-y-4">
              <div className="relative h-48 w-full overflow-hidden rounded-xl">
                <Image
                  src={course.thumbnailUrl}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
              <div className="flex flex-col gap-2 text-left">
                <SheetTitle className="text-2xl font-semibold text-slate-900">
                  {course.title}
                </SheetTitle>
                <SheetDescription className="text-sm text-slate-500">
                  {course.category.name} · {course.difficulty.label}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {course.activeEnrollmentCount.toLocaleString()} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {course.instructor.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {getEnrollmentStatusLabel(course.enrollmentStatus)}
                  </span>
                </div>
              </div>
            </SheetHeader>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Course overview</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {course.description}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Curriculum</h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="whitespace-pre-line">{course.curriculum}</p>
              </div>
            </section>

            <Separator />

            {!enrollmentGuard.isAuthenticated ? (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                Please sign in to enroll in this course.
              </p>
            ) : null}

            {enrollmentGuard.isAuthenticated && !enrollmentGuard.isLearner ? (
              <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600">
                Only learners can enroll in courses.
              </p>
            ) : null}

            <Button
              onClick={handleAction}
              disabled={
                enrollPending ||
                cancelPending ||
                (isEnrolled && !enrollmentId) ||
                (!isEnrolled && (!enrollmentGuard.canEnroll || enrollmentGuard.isLoading))
              }
              variant={isEnrolled ? 'outline' : 'default'}
              className="w-full"
            >
              {actionLabel}
            </Button>
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm text-slate-500">Select a course to view details.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
