"use client";

import { BookOpen, Clock3, Hourglass, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GradesOverviewResponse } from "@/features/grades/lib/dto";
import { formatDateTime, formatPercentage } from "@/features/grades/lib/calculations";

const METRIC_ICON_SIZE = 20;

const formatCount = (value: number) => `${value.toLocaleString()}개`;

type GradesSummaryProps = {
  overview: GradesOverviewResponse;
};

export const GradesSummary = ({ overview }: GradesSummaryProps) => {
  const { aggregate, courses } = overview;

  const latestFeedback = courses
    .map((course) => course.latestFeedback)
    .filter((feedback): feedback is NonNullable<typeof feedback> => Boolean(feedback))
    .sort((a, b) =>
      new Date(b.feedbackUpdatedAt).getTime() - new Date(a.feedbackUpdatedAt).getTime(),
    )[0];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">수강 중 강좌</CardTitle>
          <BookOpen className="text-primary" size={METRIC_ICON_SIZE} />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCount(aggregate.activeCourseCount)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 평균 점수</CardTitle>
          <TrendingUp className="text-primary" size={METRIC_ICON_SIZE} />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatPercentage(aggregate.averageScore)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">채점 대기 과제</CardTitle>
          <Hourglass className="text-primary" size={METRIC_ICON_SIZE} />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCount(aggregate.pendingFeedbackCount)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">지연 제출</CardTitle>
          <Clock3 className="text-primary" size={METRIC_ICON_SIZE} />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCount(aggregate.lateSubmissionCount)}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="text-base font-semibold">최근 피드백</CardTitle>
        </CardHeader>
        <CardContent>
          {latestFeedback ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {latestFeedback.courseTitle}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(latestFeedback.feedbackUpdatedAt)} 기준
                </span>
              </div>
              <p className="text-lg font-semibold">{latestFeedback.assignmentTitle}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {latestFeedback.feedbackText ?? "피드백 내용이 없습니다."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 도착한 피드백이 없습니다. 과제 제출 후 채점이 완료되면 이곳에서 확인할 수 있습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
