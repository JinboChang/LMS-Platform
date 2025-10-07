"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradingPanel } from "@/features/instructor-grading/components/grading-panel";
import { GradingResultBanner } from "@/features/instructor-grading/components/grading-result-banner";
import { useSubmissionDetail } from "@/features/instructor-grading/hooks/useSubmissionDetail";
import { useGradeSubmission } from "@/features/instructor-grading/hooks/useGradeSubmission";
import type { GradeSubmissionFormValues } from "@/features/instructor-grading/lib/validators";

const LoadingState = () => (
  <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
    <p className="text-sm">Loading submission detail...</p>
  </div>
);

type PageParams = {
  courseId: string;
  assignmentId: string;
  submissionId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default function InstructorSubmissionGradingPage({ params }: PageProps) {
  const [identifiers, setIdentifiers] = useState<PageParams | null>(null);

  useEffect(() => {
    let isMounted = true;

    params
      .then((resolvedParams) => {
        if (isMounted) {
          setIdentifiers(resolvedParams);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIdentifiers(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params]);

  const submissionDetailQuery = useSubmissionDetail(
    identifiers?.assignmentId ?? null,
    identifiers?.submissionId ?? null,
  );

  const gradeSubmissionMutation = useGradeSubmission(
    identifiers?.assignmentId ?? null,
    identifiers?.submissionId ?? null,
  );

  const handleSubmit = async (values: GradeSubmissionFormValues) => {
    await gradeSubmissionMutation.mutateAsync(values);
  };

  if (!identifiers) {
    return <LoadingState />;
  }

  if (submissionDetailQuery.isLoading) {
    return <LoadingState />;
  }

  if (submissionDetailQuery.isError) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Failed to load submission
          </h1>
          <p className="text-sm text-muted-foreground">
            {submissionDetailQuery.error instanceof Error
              ? submissionDetailQuery.error.message
              : "Please try again in a moment."}
          </p>
        </div>
        <Button
          onClick={() => submissionDetailQuery.refetch()}
          disabled={submissionDetailQuery.isFetching}
        >
          Retry
        </Button>
      </div>
    );
  }

  const submission = submissionDetailQuery.data ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {submission?.courseTitle ?? "Course"}
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          {submission?.assignmentTitle ?? "Assignment"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Review the learner submission, provide feedback, and record the final grade.
        </p>
      </header>

      <GradingResultBanner submission={submission ?? null} />

      <GradingPanel
        submission={submission ?? null}
        onSubmit={handleSubmit}
        isSubmitting={gradeSubmissionMutation.isPending}
      />
    </div>
  );
}
