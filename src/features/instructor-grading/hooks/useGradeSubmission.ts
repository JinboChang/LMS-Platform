"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  GradeSubmissionResponseSchema,
  type GradeSubmissionResponse,
} from "@/features/instructor-grading/lib/dto";
import type { GradeSubmissionFormValues } from "@/features/instructor-grading/lib/validators";
import { INSTRUCTOR_GRADE_MUTATION_KEY, INSTRUCTOR_SUBMISSION_DETAIL_QUERY_KEY } from "@/features/instructor-grading/constants";
import { toast } from "@/hooks/use-toast";

const statusSuccessMessages: Record<GradeSubmissionResponse["submission"]["status"], string> = {
  graded: "Submission graded successfully.",
  resubmission_required: "Resubmission requested successfully.",
  submitted: "Submission updated.",
};

const buildPayload = (values: GradeSubmissionFormValues) => ({
  score: values.score,
  feedbackText: values.feedbackText?.trim() ? values.feedbackText.trim() : undefined,
  requireResubmission: values.requireResubmission,
});

export const useGradeSubmission = (
  assignmentId: string | null,
  submissionId: string | null,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: INSTRUCTOR_GRADE_MUTATION_KEY,
    mutationFn: async (values: GradeSubmissionFormValues) => {
      if (!assignmentId || !submissionId) {
        throw new Error("Submission identifier is required.");
      }

      try {
        const authConfig = await createAuthRequestConfig();
        const { data } = await apiClient.patch<GradeSubmissionResponse>(
          `/api/instructor/assignments/${assignmentId}/submissions/${submissionId}/grade`,
          buildPayload(values),
          authConfig,
        );

        return GradeSubmissionResponseSchema.parse(data);
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          "Failed to submit grading feedback.",
        );
        throw new Error(message);
      }
    },
    onSuccess: (data) => {
      if (assignmentId && submissionId) {
        void queryClient.invalidateQueries({
          queryKey: INSTRUCTOR_SUBMISSION_DETAIL_QUERY_KEY(assignmentId, submissionId),
        });
      }

      const status = data.submission.status;
      toast({
        title: "Grading saved",
        description: statusSuccessMessages[status],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to save grading",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
