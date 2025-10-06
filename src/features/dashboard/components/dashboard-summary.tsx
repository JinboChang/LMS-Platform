"use client";

import type { LucideIcon } from "lucide-react";
import { CalendarClock, Notebook, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardSummaryViewModel,
} from "@/features/dashboard/lib/mappers";

const SUMMARY_ITEMS: Array<{
  key: keyof DashboardSummaryViewModel;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "activeCourseLabel",
    label: "Active Courses",
    description: "Courses currently in progress",
    icon: Notebook,
  },
  {
    key: "averageProgressLabel",
    label: "Average Progress",
    description: "Mean completion across courses",
    icon: TrendingUp,
  },
  {
    key: "upcomingAssignmentLabel",
    label: "Upcoming Deadlines",
    description: "Due within the next 48 hours",
    icon: CalendarClock,
  },
];

type DashboardSummaryProps = {
  summary?: DashboardSummaryViewModel;
  isLoading?: boolean;
};

const SummaryPlaceholder = () => (
  <div className="flex flex-col gap-2">
    <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
    <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
  </div>
);

export const DashboardSummary = ({
  summary,
  isLoading = false,
}: DashboardSummaryProps) => {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {SUMMARY_ITEMS.map(({ key, label, description, icon: Icon }) => (
        <Card key={key} className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SummaryPlaceholder />
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-2xl font-semibold">
                  {summary?.[key] ?? "--"}
                </p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
};