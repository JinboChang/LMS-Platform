"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AssignmentSubmissionClientError,
  useSubmitAssignment,
} from "@/features/assignments/hooks/useSubmitAssignment";
import type {
  AssignmentSubmissionFormValues,
} from "@/features/assignments/lib/submission-validators";
import {
  AssignmentSubmissionFormSchema,
  buildDefaultSubmissionValues,
} from "@/features/assignments/lib/submission-validators";
import type {
  AssignmentSubmissionResponse,
} from "@/features/assignments/lib/submission-dto";

export type AssignmentSubmitFormTone = "default" | "warning" | "destructive";

type AssignmentSubmitFormProps = {
  assignmentId: string;
  authUserId: string;
  actionLabel: string;
  helperText: string;
  tone?: AssignmentSubmitFormTone;
  disabled?: boolean;
  defaultValues?: Partial<AssignmentSubmissionFormValues>;
  onSuccess?: (
    response: AssignmentSubmissionResponse,
    values: AssignmentSubmissionFormValues,
  ) => void;
  onError?: (
    error: AssignmentSubmissionClientError,
    values: AssignmentSubmissionFormValues,
  ) => void;
};

const buttonVariantByTone: Record<AssignmentSubmitFormTone, "default" | "secondary" | "destructive"> = {
  default: "default",
  warning: "secondary",
  destructive: "destructive",
};

export const AssignmentSubmitForm = ({
  assignmentId,
  authUserId,
  actionLabel,
  helperText,
  tone = "default",
  disabled = false,
  defaultValues,
  onSuccess,
  onError,
}: AssignmentSubmitFormProps) => {
  const submissionMutation = useSubmitAssignment();

  const form = useForm<AssignmentSubmissionFormValues>({
    resolver: zodResolver(AssignmentSubmissionFormSchema),
    defaultValues: buildDefaultSubmissionValues(defaultValues),
    mode: "onChange",
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(buildDefaultSubmissionValues(defaultValues));
    }
  }, [defaultValues, form]);

  const isSubmitting = submissionMutation.isPending;
  const buttonVariant = useMemo(() => buttonVariantByTone[tone] ?? "default", [tone]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await submissionMutation.mutateAsync({
        assignmentId,
        authUserId,
        submissionText: values.submissionText,
        submissionLink: values.submissionLink,
      });

      onSuccess?.(result, values);
    } catch (error) {
      if (error instanceof AssignmentSubmissionClientError) {
        onError?.(error, values);
        return;
      }

      throw error;
    }
  });

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Form {...form}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormField
            control={form.control}
            name="submissionText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Submission text</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={8}
                    className="min-h-[160px] resize-y bg-white text-slate-900"
                    placeholder="Write your answer here."
                    disabled={disabled || isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submissionLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference link (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://example.com/work"
                    className="bg-white text-slate-900"
                    disabled={disabled || isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Button
              type="submit"
              variant={buttonVariant}
              className="w-full"
              disabled={disabled || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : actionLabel}
            </Button>
            <p
              className={
                tone === "destructive"
                  ? "text-xs text-rose-500"
                  : tone === "warning"
                    ? "text-xs text-amber-600"
                    : "text-xs text-slate-500"
              }
            >
              {helperText}
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
};
