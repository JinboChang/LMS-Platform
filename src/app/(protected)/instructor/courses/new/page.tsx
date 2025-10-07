"use client";

import { InstructorCoursesPageShell } from "@/features/instructor-courses/components/courses-page-shell";

type NewCoursePageProps = {
  params: Promise<Record<string, never>>;
};

export default function NewInstructorCoursePage({ params }: NewCoursePageProps) {
  void params;
  return <InstructorCoursesPageShell initialSheetOpen initialMode="create" />;
}
