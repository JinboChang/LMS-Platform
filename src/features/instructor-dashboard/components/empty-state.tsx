"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS,
  INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER,
} from "@/features/instructor-dashboard/constants";

const COURSE_CREATION_PATH = "/instructor/courses/new";
const EMPTY_STATE_IMAGE_SEED = "instructor-dashboard-empty";

const buildEmptyStateImage = () => {
  const { width, height } = INSTRUCTOR_DASHBOARD_COVER_DIMENSIONS;
  return `${INSTRUCTOR_DASHBOARD_IMAGE_PROVIDER}/seed/${EMPTY_STATE_IMAGE_SEED}/${width}/${height}`;
};

export const InstructorDashboardEmptyState = () => (
  <Card className="grid gap-6 overflow-hidden border-dashed border-primary/40 bg-primary/5 p-6 md:grid-cols-[1.2fr,1fr]">
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Create your first course</h2>
      <p className="max-w-xl text-sm text-muted-foreground">
        Share your expertise by publishing a course. You can draft lessons, configure assignments, and publish when you are ready. Learners will discover it in the catalog immediately after publication.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href={COURSE_CREATION_PATH}>Start new course</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Drafts stay private until you publish them.
        </p>
      </div>
    </div>
    <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
      <Image
        src={buildEmptyStateImage()}
        alt="Instructor planning a course"
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        className="object-cover"
        priority
      />
    </div>
  </Card>
);
