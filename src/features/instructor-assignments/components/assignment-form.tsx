"use client";

import { useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AssignmentFormSchema,
  type AssignmentFormValues,
} from "@/features/instructor-assignments/lib/validators";

const toLocalDateTimeInput = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const buildInitialValues = (
  defaults?: Partial<AssignmentFormValues> & { dueAt?: string },
): AssignmentFormValues => ({
  title: defaults?.title ?? "",
  description: defaults?.description ?? "",
  dueAt: defaults?.dueAt ? toLocalDateTimeInput(defaults.dueAt) : "",
  scoreWeight:
    typeof defaults?.scoreWeight === "number" && !Number.isNaN(defaults.scoreWeight)
      ? defaults.scoreWeight
      : 0,
  instructions: defaults?.instructions ?? "",
  submissionRequirements: defaults?.submissionRequirements ?? "",
  lateSubmissionAllowed: defaults?.lateSubmissionAllowed ?? false,
});

export type AssignmentFormProps = {
  defaultValues?: Partial<AssignmentFormValues> & { dueAt?: string };
  onSubmit: (values: AssignmentFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export const AssignmentForm = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save assignment",
}: AssignmentFormProps) => {
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(AssignmentFormSchema),
    defaultValues: buildInitialValues(defaultValues),
  });

  useEffect(() => {
    form.reset(buildInitialValues(defaultValues));
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const isoDueAt = values.dueAt
      ? new Date(values.dueAt).toISOString()
      : new Date().toISOString();

    await onSubmit({
      ...values,
      dueAt: isoDueAt,
    });
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Final project proposal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief overview of the assignment."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="dueAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scoreWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Score weight (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Detailed instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Outline the expectations and grading criteria."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="submissionRequirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Submission requirements</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the files or content learners must submit."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lateSubmissionAllowed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Allow late submissions</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Learners can submit after the deadline but submissions will be marked late.
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
};
