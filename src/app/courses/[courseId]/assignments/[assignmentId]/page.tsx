"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AssignmentDetailPanel } from "@/features/assignments/components/assignment-detail-panel";
import { AssignmentSubmitStatus } from "@/features/assignments/components/assignment-submit-status";
import { AssignmentSubmitForm } from "@/features/assignments/components/assignment-submit-form";
import { AssignmentSubmitResult } from "@/features/assignments/components/assignment-submit-result";
import { AssignmentNotFound } from "@/features/assignments/components/assignment-not-found";
import type { SubmissionSnapshot } from "@/features/assignments/components/assignment-submit-status";
import type { AssignmentSubmitFormTone } from "@/features/assignments/components/assignment-submit-form";
import type { AssignmentSubmissionResponse } from "@/features/assignments/lib/submission-dto";
import type { AssignmentSubmissionClientError } from "@/features/assignments/hooks/useSubmitAssignment";
import { useAssignmentDetail } from "@/features/assignments/hooks/useAssignmentDetail";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

const containerClass = "mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10";
const gridClass =
  "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]";

type PageParams = {
  courseId: string;
  assignmentId: string;
};

type AssignmentDetailPageProps = {
  params: Promise<PageParams>;
};

export default function AssignmentDetailPage({
  params,
}: AssignmentDetailPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status: authStatus, isAuthenticated } = useCurrentUser();
  const [resolvedParams, setResolvedParams] = useState<PageParams | null>(null);
  const [paramError, setParamError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] =
    useState<AssignmentSubmissionResponse | null>(null);
  const [submissionError, setSubmissionError] =
    useState<AssignmentSubmissionClientError | null>(null);

  useEffect(() => {
    let active = true;

    params
      .then((value) => {
        if (active) {
          setResolvedParams(value);
        }
      })
      .catch(() => {
        if (active) {
          setParamError("요청 경로를 해석하지 못했습니다.");
        }
      });

    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!isAuthenticated && authStatus !== "loading") {
      const redirect = pathname ? `?redirectedFrom=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
    }
  }, [authStatus, isAuthenticated, pathname, router]);

  const queryEnabled = Boolean(
    resolvedParams?.courseId && resolvedParams.assignmentId && isAuthenticated,
  );

  const assignmentQuery = useAssignmentDetail(
    {
      courseId: resolvedParams?.courseId,
      assignmentId: resolvedParams?.assignmentId,
    },
    { enabled: queryEnabled },
  );

  useEffect(() => {
    if (assignmentQuery.error?.status === 401) {
      const redirect = pathname ? `?redirectedFrom=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
    }
  }, [assignmentQuery.error?.status, pathname, router]);

  const retry = () => {
    assignmentQuery.refetch();
  };

  const handleSubmissionSuccess = (response: AssignmentSubmissionResponse) => {
    setSubmissionResult(response);
    setSubmissionError(null);
    assignmentQuery.refetch();
  };

  const handleSubmissionError = (error: AssignmentSubmissionClientError) => {
    setSubmissionError(error);
    setSubmissionResult(null);
  };

  if (paramError) {
    return (
      <div className={containerClass}>
        <AssignmentNotFound variant="error" onRetry={() => router.back()} />
      </div>
    );
  }

  if (!resolvedParams) {
    return (
      <div className={containerClass}>
        <div className="grid gap-4">
          <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200" />
          <div className="h-32 w-full animate-pulse rounded-md bg-slate-200" />
        </div>
      </div>
    );
  }

  const isLoading =
    assignmentQuery.status === "pending" || assignmentQuery.fetchStatus === "fetching";

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className={gridClass}>
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
            <div className="h-40 w-full animate-pulse rounded-md bg-slate-200" />
            <div className="h-24 w-full animate-pulse rounded-md bg-slate-200" />
          </div>
          <div className="space-y-4">
            <div className="h-12 w-full animate-pulse rounded-md bg-slate-200" />
            <div className="h-40 w-full animate-pulse rounded-md bg-slate-200" />
            <div className="h-32 w-full animate-pulse rounded-md bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (assignmentQuery.status === "error") {
    const status = assignmentQuery.error?.status;
    const variant = status === 403 ? "forbidden" : status === 404 ? "notFound" : "error";

    return (
      <div className={containerClass}>
        <AssignmentNotFound variant={variant} onRetry={retry} />
      </div>
    );
  }

  const { assignment, submission, canSubmit, isLate } = assignmentQuery.data;

  const baseSubmission = submissionResult ?? submission ?? null;

  const snapshot: SubmissionSnapshot | null = baseSubmission
    ? {
        status: baseSubmission.status,
        late: baseSubmission.late,
        submittedAt: baseSubmission.submittedAt,
        isResubmission: submissionResult?.isResubmission ?? false,
        message: submissionResult?.message,
        previousStatus:
          submissionResult?.previousStatus ?? submission?.status ?? null,
      }
    : null;

  const hasSubmission = Boolean(baseSubmission);

  let formTone: AssignmentSubmitFormTone = "default";
  let formHelperText = hasSubmission
    ? "재제출 시 기존 제출 내용이 교체됩니다."
    : "요구 사항을 확인한 뒤 제출해주세요.";
  let actionLabel = hasSubmission ? "재제출하기" : "제출하기";
  let formDisabled = !canSubmit;

  if (!canSubmit) {
    formTone = "destructive";
    formHelperText = isLate && !assignment.lateSubmissionAllowed
      ? "마감 기한이 지나 제출할 수 없습니다."
      : "지금은 제출을 진행할 수 없습니다.";
  } else if (isLate) {
    formTone = "warning";
    actionLabel = hasSubmission ? "지각 재제출하기" : "지각 제출하기";
    formHelperText = "지각 제출은 지각으로 기록됩니다.";
  }

  const defaultFormValues = submission
    ? {
        submissionText: submission.submissionText,
        submissionLink: submission.submissionLink ?? undefined,
      }
    : undefined;

  return (
    <div className={containerClass}>
      <header className="space-y-2">
        <p className="text-sm text-slate-500">
          나의 코스 · 과제 상세 · {resolvedParams.courseId}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {assignment.title}
        </h1>
      </header>
      <div className={gridClass}>
        <AssignmentDetailPanel assignment={assignment} isLate={isLate} />
        <div className="space-y-6">
          <AssignmentSubmitStatus
            assignmentTitle={assignment.title}
            dueAt={assignment.dueAt}
            lateSubmissionAllowed={assignment.lateSubmissionAllowed}
            canSubmit={canSubmit}
            snapshot={snapshot}
          />
          <AssignmentSubmitForm
            assignmentId={assignment.id}
            authUserId={user?.id ?? ""}
            actionLabel={actionLabel}
            helperText={formHelperText}
            tone={formTone}
            disabled={formDisabled || !user?.id}
            defaultValues={defaultFormValues}
            onSuccess={handleSubmissionSuccess}
            onError={handleSubmissionError}
          />
          <AssignmentSubmitResult result={submissionResult} error={submissionError} />
        </div>
      </div>
    </div>
  );
}
