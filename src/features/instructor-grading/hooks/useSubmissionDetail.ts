"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";
import {
  SubmissionDetailResponseSchema,
  type SubmissionDetailResponse,
} from "@/features/instructor-grading/lib/dto";
import { mapSubmissionDetail } from "@/features/instructor-grading/lib/mappers";
import { INSTRUCTOR_SUBMISSION_DETAIL_QUERY_KEY } from "@/features/instructor-grading/constants";

const PLACEHOLDER_QUERY_KEY = [
  'instructor',
  'assignments',
  'submissions',
  'detail',
  'placeholder',
] as const;

export const useSubmissionDetail = (
  assignmentId: string | null,
  submissionId: string | null,
) =>
  useQuery({
    queryKey:
      assignmentId && submissionId
        ? INSTRUCTOR_SUBMISSION_DETAIL_QUERY_KEY(assignmentId, submissionId)
        : PLACEHOLDER_QUERY_KEY,
    enabled: Boolean(assignmentId && submissionId),
    queryFn: async () => {
      if (!assignmentId || !submissionId) {
        throw new Error("Submission identifier is required.");
      }

      try {
        const authConfig = await createAuthRequestConfig();
        const { data } = await apiClient.get<SubmissionDetailResponse>(
          `/api/instructor/assignments/${assignmentId}/submissions/${submissionId}`,
          authConfig,
        );

        const parsed = SubmissionDetailResponseSchema.parse(data);
        return mapSubmissionDetail(parsed.submission);
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          "Failed to load submission detail.",
        );
        throw new Error(message);
      }
    },
  });
