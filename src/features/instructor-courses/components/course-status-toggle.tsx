"use client";

import { Button } from "@/components/ui/button";
import type { CourseStatus } from "@/features/instructor-courses/lib/dto";

const statusActionLabels: Record<CourseStatus, string> = {
  draft: "Move to draft",
  published: "Publish course",
  archived: "Archive course",
};

const statusConfirmMessages: Record<CourseStatus, string> = {
  draft: "",
  published: "Publish this course so it becomes visible to learners?",
  archived: "Archive this course and close new enrollments?",
};

type CourseStatusToggleProps = {
  courseId: string;
  currentStatus: CourseStatus;
  allowedTransitions: readonly CourseStatus[];
  isUpdating?: boolean;
  onChange: (courseId: string, nextStatus: CourseStatus) => void;
};

export const CourseStatusToggle = ({
  courseId,
  currentStatus,
  allowedTransitions,
  isUpdating = false,
  onChange,
}: CourseStatusToggleProps) => {
  if (allowedTransitions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {currentStatus === "archived"
          ? "Course is archived."
          : "No additional status actions available."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from(allowedTransitions).map((status) => {
        const label = statusActionLabels[status];
        const confirmation = statusConfirmMessages[status];

        return (
          <Button
            key={status}
            size="sm"
            variant={status === "published" ? "default" : "outline"}
            disabled={isUpdating}
            onClick={() => {
              if (confirmation) {
                const shouldProceed = window.confirm(confirmation);

                if (!shouldProceed) {
                  return;
                }
              }

              onChange(courseId, status);
            }}
          >
            {isUpdating ? "Updating…" : label}
          </Button>
        );
      })}
    </div>
  );
};
