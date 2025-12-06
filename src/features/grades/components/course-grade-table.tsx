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
        No gradable assignments yet. Scores and feedback will appear here once assignments open.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full divide-y divide-border">
        <caption className="sr-only">Assignment grades and feedback</caption>
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              Assignment
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              Score
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              Weight
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              Submitted at
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              Late
            </th>
            <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">
              Feedback
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
                    Due {formatDateTime(assignment.dueAt)}
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
                      View details
                    </Button>
                  </FeedbackDetailDialog>
                ) : (
                  <span className="text-sm text-muted-foreground">Feedback pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
