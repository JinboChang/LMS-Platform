"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const GradesEmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-muted-foreground/60 px-6 py-12 text-center">
    <Image
      src="https://picsum.photos/seed/grades-empty/640/360"
      alt="Student preparing a new assignment"
      width={320}
      height={180}
      className="h-auto w-full max-w-xs rounded-lg object-cover"
      priority
    />
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold">No grades to show yet</h2>
      <p className="text-sm text-muted-foreground">
        Either no assignments are graded or you are not enrolled. Enroll in a course and submit assignments to see grades and feedback here.
      </p>
    </div>
    <Button asChild variant="default">
      <Link href="/courses">Browse courses</Link>
    </Button>
  </div>
);
