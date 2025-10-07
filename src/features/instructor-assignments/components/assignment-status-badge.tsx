"use client";

import { CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { AssignmentStatus } from "@/features/instructor-assignments/lib/dto";

const statusLabels: Record<AssignmentStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

const statusVariants: Record<AssignmentStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  published: "default",
  closed: "outline",
};

const formatTimestamp = (value: string) => format(new Date(value), "PPP p");

const buildStatusCaption = (
  status: AssignmentStatus,
  publishedAt: string | null,
  closedAt: string | null
) => {
  if (status === "draft") {
    return "Not yet published";
  }

  if (status === "published" && publishedAt) {
    return `Published ${formatTimestamp(publishedAt)}`;
  }

  if (status === "closed" && closedAt) {
    return `Closed ${formatTimestamp(closedAt)}`;
  }

  if (status === "published") {
    return "Ready for learner submissions";
  }

  return "Submissions closed";
};

type AssignmentStatusBadgeProps = {
  status: AssignmentStatus;
  publishedAt: string | null;
  closedAt: string | null;
};

export const AssignmentStatusBadge = ({
  status,
  publishedAt,
  closedAt,
}: AssignmentStatusBadgeProps) => {
  const caption = buildStatusCaption(status, publishedAt, closedAt);

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        {caption}
      </span>
    </div>
  );
};

