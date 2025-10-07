"use client";

import Link from "next/link";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { SubmissionDetailViewModel } from "@/features/instructor-grading/lib/mappers";
import {
  GradeSubmissionFormSchema,
  type GradeSubmissionFormValues,
} from "@/features/instructor-grading/lib/validators";

const toFormValues = (
  submission: SubmissionDetailViewModel | null,
): GradeSubmissionFormValues => ({
  score: submission?.score ?? 0,
  feedbackText: submission?.feedbackText ?? "",
  requireResubmission: submission?.status === "resubmission_required",
});

type GradingPanelProps = {
  submission: SubmissionDetailViewModel | null;
  onSubmit: (values: GradeSubmissionFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
};

export const GradingPanel = ({ submission, onSubmit, isSubmitting = false }: GradingPanelProps) => {
  const form = useForm<GradeSubmissionFormValues>({
    resolver: zodResolver(GradeSubmissionFormSchema),
    defaultValues: toFormValues(submission),
  });

  useEffect(() => {
    form.reset(toFormValues(submission));
  }, [form, submission]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  if (!submission) {
    return null;
  }

  const scoreValue = form.watch("score");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <div className="space-y-4">
        <section className="rounded-lg border border-muted bg-card p-4">
          <header className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Course</p>
            <h2 className="text-base font-semibold text-foreground">{submission.courseTitle}</h2>
          </header>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Assignment</p>
              <p>{submission.assignmentTitle}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Learner</p>
              <p>{submission.learner.name ?? "Unknown learner"}</p>
              {submission.learner.email ? (
                <p className="text-xs text-muted-foreground">{submission.learner.email}</p>
              ) : null}
            </div>
            <div>
              <p className="font-medium text-foreground">Submitted</p>
              <p>
                {submission.submittedAtLabel} - {submission.submittedAtRelative}
                {submission.late ? " - Late" : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-muted bg-card p-4">
          <header className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Submission content</h3>
            {submission.submissionLink ? (
              <Button asChild size="sm" variant="outline">
                <Link href={submission.submissionLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                  Open link
                </Link>
              </Button>
            ) : null}
          </header>
          <div className="mt-3 rounded-md border border-dashed border-muted/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            {submission.submissionText ? (
              <p className="whitespace-pre-wrap break-words">{submission.submissionText}</p>
            ) : (
              <p>No written response was provided.</p>
            )}
          </div>
        </section>
      </div>

      <Form {...form}>
        <form className="space-y-6 rounded-lg border border-muted bg-card p-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Grade submission</h3>
            <p className="text-sm text-muted-foreground">
              Record a score and share feedback with the learner.
            </p>
          </div>

          <FormField
            control={form.control}
            name="score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Score (0-100)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={field.value === "" ? "" : String(field.value ?? "")}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="feedbackText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Feedback for learner</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder="Share what went well and what can be improved."
                    value={field.value === "" ? "" : String(field.value ?? "")}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requireResubmission"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Request resubmission</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Learner will be notified that updates are required before grading completes.
                  </p>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save grading"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

