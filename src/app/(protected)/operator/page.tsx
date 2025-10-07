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
    title: "신고 대응 자동화",
    description: "조치 기록과 상태 전환을 한 화면에서 처리할 수 있습니다.",
  },
  {
    title: "메타데이터 동기화",
    description: "카테고리와 난이도 변경이 즉시 코스 관리 화면에 반영됩니다.",
  },
  {
    title: "실시간 감사 로그",
    description: "조치 내역을 투명하게 남겨 후속 조치에 활용하세요.",
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
              <ShieldCheck className="h-5 w-5" /> 운영 대시보드
            </div>
            <h1 className="text-3xl font-semibold text-foreground">
              신고 대응과 메타데이터 관리를 한 곳에서
            </h1>
            <p className="text-sm text-muted-foreground">
              신고 현황, 처리 이력, 카테고리와 난이도를 통합 관리하여 학습자 경험을 안정적으로 유지하세요.
            </p>
          </div>
          <div className="relative h-40 w-full overflow-hidden rounded-xl border lg:w-80">
            <Image
              src={buildHeroImage()}
              alt="운영 대시보드 히어로 이미지"
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

