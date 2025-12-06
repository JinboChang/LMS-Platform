'use client';

import Image from 'next/image';
import { BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CourseSummaryDto } from '@/features/courses/lib/dto';
import { getEnrollmentStatusLabel } from '@/features/courses/lib/enrollment-status';

export type CourseCardProps = {
  course: CourseSummaryDto;
  onSelect: (courseId: string) => void;
  onEnroll: (courseId: string) => void;
  onCancel: (enrollmentId: string, courseId: string) => void;
  enrollPending?: boolean;
  cancelPending?: boolean;
};

export const CourseCard = ({
  course,
  onSelect,
  onEnroll,
  onCancel,
  enrollPending = false,
  cancelPending = false,
}: CourseCardProps) => {
  const enrollmentId = course.enrollment?.id ?? null;
  const isEnrolled = Boolean(
    course.enrollmentStatus === 'active' && enrollmentId,
  );
  const canCancel = isEnrolled && Boolean(enrollmentId);

  const handlePrimaryClick = () => {
    if (isEnrolled && enrollmentId) {
      onCancel(enrollmentId, course.id);
      return;
    }

    onEnroll(course.id);
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={course.thumbnailUrl}
          alt={`${course.title} course image`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 25vw"
          priority={false}
        />
      </div>
      <CardHeader className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{course.category.name}</Badge>
          <span className="text-xs text-slate-500">
            {getEnrollmentStatusLabel(course.enrollmentStatus)}
          </span>
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-600">{course.summary}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 py-0">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course.activeEnrollmentCount.toLocaleString()} enrolled
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.difficulty.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(course.id)}
          className="text-left text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          View curriculum and details
        </button>
      </CardContent>
      <CardFooter className="mt-auto flex flex-col gap-2 px-5 pb-5">
        <Button
          onClick={handlePrimaryClick}
          disabled={
            enrollPending ||
            cancelPending ||
            (canCancel && !enrollmentId)
          }
          className="w-full"
          variant={isEnrolled ? 'outline' : 'default'}
        >
          {isEnrolled
            ? cancelPending
              ? 'Cancelling...'
              : 'Cancel enrollment'
            : enrollPending
              ? 'Enrolling...'
              : 'Enroll now'}
        </Button>
      </CardFooter>
    </Card>
  );
};
