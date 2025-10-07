"use client";

import Link from "next/link";
import Image from "next/image";
import { PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourseStatusToggle } from "@/features/instructor-courses/components/course-status-toggle";
import type {
  InstructorCourseSummary,
  InstructorCourseListViewModel,
} from "@/features/instructor-courses/lib/mappers";

const statusOrder: InstructorCourseListViewModel["courses"][number]["status"][] = [
  "draft",
  "published",
  "archived",
];

type CourseListProps = {
  courses: InstructorCourseSummary[];
  statusCounts: InstructorCourseListViewModel["statusCounts"];
  onEdit: (course: InstructorCourseSummary) => void;
  onChangeStatus: (
    courseId: string,
    nextStatus: InstructorCourseSummary["status"],
  ) => void;
  isLoading?: boolean;
  updatingCourseId?: string | null;
};

const StatusSummary = ({
  statuses,
  counts,
}: {
  statuses: InstructorCourseSummary["status"][];
  counts: InstructorCourseListViewModel["statusCounts"];
}) => (
  <div className="grid gap-4 md:grid-cols-3">
    {statuses.map((status) => (
      <Card key={status} className="border-muted">
        <CardContent className="flex flex-col gap-2 p-4">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {status}
          </span>
          <span className="text-2xl font-semibold">
            {counts[status].toLocaleString()}
          </span>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const CourseList = ({
  courses,
  statusCounts,
  onEdit,
  onChangeStatus,
  isLoading = false,
  updatingCourseId = null,
}: CourseListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-muted">
            <div className="flex animate-pulse gap-6 p-6">
              <div className="h-32 w-48 rounded-lg bg-muted" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-3/4 rounded-md bg-muted" />
                <div className="h-4 w-1/2 rounded-md bg-muted" />
                <div className="h-3 w-full rounded-md bg-muted" />
                <div className="h-3 w-2/3 rounded-md bg-muted" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="space-y-3 p-6 text-center">
          <CardTitle className="text-2xl">No courses yet</CardTitle>
          <p className="text-sm text-muted-foreground">
            Draft your first course to help learners discover your expertise.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <StatusSummary statuses={statusOrder} counts={statusCounts} />

      <div className="grid gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="border-muted">
            <div className="grid gap-6 p-6 md:grid-cols-[240px,1fr]">
              <div className="relative h-32 w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={course.coverImageUrl}
                  alt={`${course.title} cover`}
                  fill
                  sizes="(max-width: 768px) 100vw, 240px"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl font-semibold">
                        {course.title}
                      </CardTitle>
                      <Badge variant={course.statusBadgeVariant}>{course.statusLabel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {course.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{course.category.name}</span>
                      <span>•</span>
                      <span>{course.difficulty.label}</span>
                      <span>•</span>
                      <span>Updated {course.updatedAtRelative}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(course)}
                      className="inline-flex items-center gap-2"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/instructor/courses/${course.id}/assignments`}>
                        Assignments
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1.2fr,1fr]">
                  <div>
                    <h4 className="text-sm font-medium">Curriculum</h4>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {course.curriculum}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Status actions</h4>
                    <CourseStatusToggle
                      courseId={course.id}
                      currentStatus={course.status}
                      allowedTransitions={course.allowedTransitions}
                      onChange={onChangeStatus}
                      isUpdating={updatingCourseId === course.id}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
