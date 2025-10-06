"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssignmentGrade } from "@/features/grades/lib/dto";
import {
  buildLateLabel,
  formatDateTime,
  formatPercentage,
  formatScore,
  getSubmissionStatusLabel,
  isPendingFeedbackStatus,
} from "@/features/grades/lib/calculations";
import { FeedbackDetailDialog } from "@/features/grades/components/feedback-detail-dialog";

const buildRowKey = (assignment: AssignmentGrade) =>
  `${assignment.assignmentId}-${assignment.submissionStatus}`;

type CourseGradeTableProps = {
  assignments: AssignmentGrade[];
};

export const CourseGradeTable = ({ assignments }: CourseGradeTableProps) => {
  const rows = useMemo(() => assignments, [assignments]);

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-muted-foreground/50 px-4 py-6 text-center text-sm text-muted-foreground">
        아직 채점 가능한 과제가 없습니다. 과제가 공개되면 이곳에서 점수와 피드백을 확인할 수 있습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full divide-y divide-border">
        <caption className="sr-only">과제별 성적 및 피드백 목록</caption>
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              과제명
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              상태
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              점수
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              반영 비율
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              제출일
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              지연 여부
            </th>
            <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">
              피드백
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {rows.map((assignment) => (
            <tr key={buildRowKey(assignment)} className="hover:bg-muted/40">
              <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                <div className="flex flex-col">
                  <span>{assignment.title}</span>
                  <span className="text-xs text-muted-foreground">
                    마감 {formatDateTime(assignment.dueAt)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 align-top text-sm">
                <Badge
                  variant={
                    isPendingFeedbackStatus(assignment.submissionStatus)
                      ? "secondary"
                      : assignment.submissionStatus === "graded"
                        ? "default"
                        : "outline"
                  }
                >
                  {getSubmissionStatusLabel(assignment.submissionStatus)}
                </Badge>
              </td>
              <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                {formatScore(assignment.score)}
              </td>
              <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                {formatPercentage(assignment.scoreWeight)}
              </td>
              <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                {formatDateTime(assignment.submittedAt)}
              </td>
              <td className="px-4 py-3 align-top text-sm">
                <Badge variant={assignment.late ? "destructive" : "outline"}>
                  {buildLateLabel(assignment.late)}
                </Badge>
              </td>
              <td className="px-4 py-3 align-top text-right">
                {assignment.feedbackText || assignment.score !== null ? (
                  <FeedbackDetailDialog assignment={assignment}>
                    <Button variant="outline" size="sm">
                      상세 보기
                    </Button>
                  </FeedbackDetailDialog>
                ) : (
                  <span className="text-sm text-muted-foreground">피드백 대기</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
