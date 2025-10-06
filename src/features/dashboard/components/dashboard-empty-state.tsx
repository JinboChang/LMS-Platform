"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type DashboardEmptyStateProps = {
  headline?: string;
  description?: string;
};

const COVER_IMAGE_URL = "https://picsum.photos/seed/dashboard-empty/960/540";

export const DashboardEmptyState = ({
  headline = "No active courses yet",
  description = "Enroll in a course to start tracking your assignments and feedback.",
}: DashboardEmptyStateProps) => {
  return (
    <section className="flex flex-col items-center gap-6 rounded-xl border border-dashed border-muted/60 bg-background/80 p-8 text-center">
      <div className="relative h-40 w-full max-w-xl overflow-hidden rounded-lg">
        <Image
          src={COVER_IMAGE_URL}
          alt="Placeholder illustration"
          fill
          priority
          sizes="(min-width: 768px) 512px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">{headline}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="default">
        <Link href="/courses">Browse courses</Link>
      </Button>
    </section>
  );
};