"use client";

import { InstructorCoursesPageShell } from "@/features/instructor-courses/components/courses-page-shell";

type CoursesPageProps = {
  params: Promise<Record<string, never>>;
};

export default function InstructorCoursesPage({ params }: CoursesPageProps) {
  void params;
  return <InstructorCoursesPageShell />;
}
