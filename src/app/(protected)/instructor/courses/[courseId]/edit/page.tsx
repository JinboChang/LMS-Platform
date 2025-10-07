"use client";

import { useEffect, useState } from "react";
import { InstructorCoursesPageShell } from "@/features/instructor-courses/components/courses-page-shell";

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default function InstructorCourseEditPage({
  params,
}: EditCoursePageProps) {
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    params
      .then((value) => {
        if (isActive) {
          setCourseId(value.courseId);
        }
      })
      .catch(() => {
        if (isActive) {
          setCourseId(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [params]);

  return (
    <InstructorCoursesPageShell
      initialSheetOpen
      initialMode="edit"
      initialCourseId={courseId}
    />
  );
}
