"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AssignmentForm } from "@/features/instructor-assignments/components/assignment-form";
import { AssignmentList } from "@/features/instructor-assignments/components/assignment-list";
import { useAssignments } from "@/features/instructor-assignments/hooks/useAssignments";
import { useCreateAssignment } from "@/features/instructor-assignments/hooks/useCreateAssignment";
import { useUpdateAssignment } from "@/features/instructor-assignments/hooks/useUpdateAssignment";
import { useAssignmentStatusMutation } from "@/features/instructor-assignments/hooks/useAssignmentStatusMutation";
import { AssignmentStatusDialog } from "@/features/instructor-assignments/components/assignment-status-dialog";
import type { InstructorAssignmentSummary } from "@/features/instructor-assignments/lib/mappers";
import type { AssignmentStatus } from "@/features/instructor-assignments/lib/dto";
import type { AssignmentFormValues } from "@/features/instructor-assignments/lib/validators";
import { toast } from "@/hooks/use-toast";

const DEFAULT_ASSIGNMENT_FORM: AssignmentFormValues = {
  title: "",
  description: "",
  dueAt: "",
  scoreWeight: 0,
  instructions: "",
  submissionRequirements: "",
  lateSubmissionAllowed: false,
};

type AssignmentsPageShellProps = {
  courseId: string;
};

export const AssignmentsPageShell = ({ courseId }: AssignmentsPageShellProps) => {
  const assignmentsQuery = useAssignments(courseId);
  const createAssignmentMutation = useCreateAssignment(courseId);
  const updateAssignmentMutation = useUpdateAssignment(courseId);
  const assignmentStatusMutation = useAssignmentStatusMutation(courseId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedAssignment, setSelectedAssignment] =
    useState<InstructorAssignmentSummary | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{
    assignment: InstructorAssignmentSummary;
    nextStatus: AssignmentStatus;
  } | null>(null);

  useEffect(() => {
    if (!sheetOpen) {
      setSelectedAssignment(null);
      setMode("create");
    }
  }, [sheetOpen]);

  const handleCreateClick = () => {
    setMode("create");
    setSelectedAssignment(null);
    setSheetOpen(true);
  };

  const handleEditAssignment = (assignment: InstructorAssignmentSummary) => {
    setMode("edit");
    setSelectedAssignment(assignment);
    setSheetOpen(true);
  };

  const handleFormSubmit = async (values: AssignmentFormValues) => {
    try {
      if (mode === "create") {
        await createAssignmentMutation.mutateAsync(values);
      } else if (mode === "edit" && selectedAssignment) {
        await updateAssignmentMutation.mutateAsync({
          assignmentId: selectedAssignment.id,
          payload: values,
        });
      }

      setSheetOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Request failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleStatusSelection = (
    assignment: InstructorAssignmentSummary,
    nextStatus: AssignmentStatus,
  ) => {
    setStatusTarget({ assignment, nextStatus });
    setStatusDialogOpen(true);
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget) {
      return;
    }

    try {
      await assignmentStatusMutation.mutateAsync({
        assignmentId: statusTarget.assignment.id,
        nextStatus: statusTarget.nextStatus,
      });
      setStatusDialogOpen(false);
      setStatusTarget(null);
    } catch {
      // Error toast is handled inside the hook, so no extra handling is needed here.
    }
  };

  const defaultFormValues: AssignmentFormValues & { dueAt?: string } = selectedAssignment
    ? {
        title: selectedAssignment.title,
        description: selectedAssignment.description,
        dueAt: selectedAssignment.dueAt,
        scoreWeight: selectedAssignment.scoreWeight,
        instructions: selectedAssignment.instructions,
        submissionRequirements: selectedAssignment.submissionRequirements,
        lateSubmissionAllowed: selectedAssignment.lateSubmissionAllowed,
      }
    : DEFAULT_ASSIGNMENT_FORM;

  if (assignmentsQuery.isError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Failed to load assignments</h1>
          <p className="text-sm text-muted-foreground">
            {assignmentsQuery.error instanceof Error
              ? assignmentsQuery.error.message
              : "Please try again in a moment."}
          </p>
        </div>
        <Button
          onClick={() => assignmentsQuery.refetch()}
          disabled={assignmentsQuery.isFetching}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Assignment management</h1>
          <p className="text-sm text-muted-foreground">
            Draft, publish, and close assignments to guide learners through your course.
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          className="inline-flex items-center gap-2"
          disabled={assignmentsQuery.isLoading}
        >
          <Plus className="h-4 w-4" />
          New assignment
        </Button>
      </header>

      <AssignmentList
        assignments={assignmentsQuery.data?.assignments ?? []}
        statusCounts={
          assignmentsQuery.data?.statusCounts ?? {
            draft: 0,
            published: 0,
            closed: 0,
          }
        }
        onEdit={handleEditAssignment}
        onSelectStatus={handleStatusSelection}
        isLoading={assignmentsQuery.isLoading}
        updatingAssignmentId={
          assignmentStatusMutation.isPending
            ? assignmentStatusMutation.variables?.assignmentId ?? null
            : null
        }
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {mode === "create" ? "Create assignment" : "Edit assignment"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AssignmentForm
              defaultValues={selectedAssignment ? defaultFormValues : undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => setSheetOpen(false)}
              isSubmitting={
                createAssignmentMutation.isPending ||
                updateAssignmentMutation.isPending
              }
              submitLabel={mode === "create" ? "Create assignment" : "Save changes"}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AssignmentStatusDialog
        open={statusDialogOpen}
        assignment={statusTarget?.assignment ?? null}
        targetStatus={statusTarget?.nextStatus ?? null}
        onClose={() => {
          setStatusDialogOpen(false);
          setStatusTarget(null);
        }}
        onConfirm={handleStatusConfirm}
        isProcessing={assignmentStatusMutation.isPending}
      />
    </div>
  );
};
