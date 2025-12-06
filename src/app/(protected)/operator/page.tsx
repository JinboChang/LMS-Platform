"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { ReportTable } from "@/features/operator/components/report-table";
import { ReportDetailDrawer } from "@/features/operator/components/report-detail-drawer";
import { MetadataEditor } from "@/features/operator/components/metadata-editor";

type OperatorPageProps = {
  params: Promise<Record<string, never>>;
};

const buildHeroImage = () =>
  `https://picsum.photos/seed/operator-dashboard/1200/400`;

const highlights = [
  {
    title: "Automated routing",
    description: "Requests are triaged by priority and SLA so the right person sees them first.",
  },
  {
    title: "Metadata in sync",
    description: "Category and status changes instantly flow into course and assignment views.",
  },
  {
    title: "Audit-ready log",
    description: "Track every action and response so policies stay clear and enforceable.",
  },
];

const OperatorPage = ({ params }: OperatorPageProps) => {
  void params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-5 w-5" /> Operations dashboard
            </div>
            <h1 className="text-3xl font-semibold text-foreground">
              Manage alerts, escalations, and metadata in one place
            </h1>
            <p className="text-sm text-muted-foreground">
              Keep service reliable by grouping alerts, responses, and categories with a clear workflow for your team.
            </p>
          </div>
          <div className="relative h-40 w-full overflow-hidden rounded-xl border lg:w-80">
            <Image
              src={buildHeroImage()}
              alt="Operations dashboard illustration"
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </header>

      <main className="flex flex-col gap-10">
        <ReportTable />
        <MetadataEditor />
      </main>

      <ReportDetailDrawer />
    </div>
  );
};

export default OperatorPage;
