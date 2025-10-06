"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const GradesEmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-muted-foreground/60 px-6 py-12 text-center">
    <Image
      src="https://picsum.photos/seed/grades-empty/640/360"
      alt="새로운 과제를 준비하는 학생"
      width={320}
      height={180}
      className="h-auto w-full max-w-xs rounded-lg object-cover"
      priority
    />
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold">확인 가능한 성적이 없습니다</h2>
      <p className="text-sm text-muted-foreground">
        아직 채점된 과제가 없거나 수강 중인 강좌가 없습니다. 강좌를 수강하고 과제를 제출하면 성적과 피드백을 확인할 수 있습니다.
      </p>
    </div>
    <Button asChild variant="default">
      <Link href="/courses">강좌 둘러보기</Link>
    </Button>
  </div>
);
