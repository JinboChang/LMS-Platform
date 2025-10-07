"use client";

import { useEffect, useState } from "react";
import { AssignmentsPageShell } from "@/features/instructor-assignments/components/assignments-page-shell";

type InstructorCourseAssignmentsPageProps = {
  params: Promise<{ courseId: string }>;
};

export default function InstructorCourseAssignmentsPage({
  params,
}: InstructorCourseAssignmentsPageProps) {
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    params
      .then(({ courseId: resolvedCourseId }) => {
        if (isMounted) {
          setCourseId(resolvedCourseId);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCourseId(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params]);

  if (!courseId) {
    return null;
  }

  return <AssignmentsPageShell courseId={courseId} />;
}
