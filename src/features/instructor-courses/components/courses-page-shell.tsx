"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CourseForm } from "@/features/instructor-courses/components/course-form";
import { CourseList } from "@/features/instructor-courses/components/course-list";
import { useCourseList } from "@/features/instructor-courses/hooks/useCourseList";
import { useCreateCourse } from "@/features/instructor-courses/hooks/useCreateCourse";
import { useUpdateCourse } from "@/features/instructor-courses/hooks/useUpdateCourse";
import { useChangeCourseStatus } from "@/features/instructor-courses/hooks/useChangeCourseStatus";
import type { InstructorCourseSummary } from "@/features/instructor-courses/lib/mappers";
import type { CourseFormValues } from "@/features/instructor-courses/lib/validators";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { toast } from "@/hooks/use-toast";

type InstructorCoursesPageShellProps = {
  initialSheetOpen?: boolean;
  initialMode?: "create" | "edit";
  initialCourseId?: string | null;
};

const extractRole = (metadata: Record<string, unknown> | null | undefined) => {
  const raw = metadata?.role;
  return typeof raw === "string" ? raw : null;
};

export const InstructorCoursesPageShell = ({
  initialSheetOpen = false,
  initialMode = "create",
  initialCourseId = null,
}: InstructorCoursesPageShellProps) => {
  const { user } = useCurrentUser();
  const role = extractRole(user?.userMetadata);

  const [sheetOpen, setSheetOpen] = useState(initialSheetOpen);
  const [mode, setMode] = useState<"create" | "edit">(initialMode);
  const [selectedCourse, setSelectedCourse] = useState<InstructorCourseSummary | null>(null);
  const hasAppliedInitialCourse = useRef(false);

  const courseListQuery = useCourseList();
  const createCourseMutation = useCreateCourse();
  const updateCourseMutation = useUpdateCourse();
  const changeStatusMutation = useChangeCourseStatus();

  const categories = (courseListQuery.data?.metadata.categories ?? []) as {
    id: string;
    name: string;
  }[];
  const difficultyLevels = (
    courseListQuery.data?.metadata.difficultyLevels ?? []
  ) as {
    id: string;
    label: string;
  }[];

  const handleCreateClick = () => {
    setMode("create");
    setSelectedCourse(null);
    setSheetOpen(true);
  };

  const handleEditCourse = (course: InstructorCourseSummary) => {
    setMode("edit");
    setSelectedCourse(course);
    setSheetOpen(true);
  };

  const handleFormSubmit = async (values: CourseFormValues) => {
    try {
      if (mode === "create") {
        await createCourseMutation.mutateAsync(values);
      } else if (mode === "edit" && selectedCourse) {
        await updateCourseMutation.mutateAsync({
          courseId: selectedCourse.id,
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

  const handleStatusChange = async (
    courseId: string,
    nextStatus: InstructorCourseSummary["status"],
  ) => {
    try {
      await changeStatusMutation.mutateAsync({
        courseId,
        nextStatus,
      });
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Status update failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const isInstructor = role === "instructor";

  const sheetTitle = useMemo(
    () => (mode === "create" ? "Create course" : "Edit course"),
    [mode],
  );

  useEffect(() => {
    hasAppliedInitialCourse.current = false;
  }, [initialCourseId]);

  useEffect(() => {
    setSheetOpen(initialSheetOpen);
  }, [initialSheetOpen]);

  useEffect(() => {
    setMode(initialMode);
    if (initialMode === "create") {
      setSelectedCourse(null);
    }
  }, [initialMode]);

  useEffect(() => {
    if (!initialCourseId) {
      return;
    }

    if (!courseListQuery.data || courseListQuery.isLoading) {
      return;
    }

    if (hasAppliedInitialCourse.current) {
      return;
    }

    hasAppliedInitialCourse.current = true;

    const matchedCourse = courseListQuery.data.courses.find(
      (course) => course.id === initialCourseId,
    );

    if (!matchedCourse) {
      toast({
        title: "Course unavailable",
        description: "We couldn't find the requested course.",
        variant: "destructive",
      });
      return;
    }

    setSelectedCourse(matchedCourse);
    setMode("edit");
    setSheetOpen(true);
  }, [
    initialCourseId,
    courseListQuery.data,
    courseListQuery.isLoading,
  ]);

  if (role && !isInstructor) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-5 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Instructor access required</h1>
          <p className="text-sm text-muted-foreground">
            Switch to an instructor profile to manage courses or complete onboarding.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            toast({
              title: "Contact support",
              description: "Please reach out to an admin to enable instructor access.",
            })
          }
        >
          Need help?
        </Button>
      </div>
    );
  }

  if (courseListQuery.isError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Failed to load courses</h1>
          <p className="text-sm text-muted-foreground">
            {courseListQuery.error instanceof Error
              ? courseListQuery.error.message
              : "Please try again in a moment."}
          </p>
        </div>
        <Button onClick={() => courseListQuery.refetch()} disabled={courseListQuery.isFetching}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Course management</h1>
          <p className="text-sm text-muted-foreground">
            Draft, publish, and maintain your courses in one place.
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          className="inline-flex items-center gap-2"
          disabled={courseListQuery.isLoading}
        >
          <Plus className="h-4 w-4" />
          New course
        </Button>
      </header>

      <CourseList
        courses={courseListQuery.data?.courses ?? []}
        statusCounts={
          courseListQuery.data?.statusCounts ?? {
            draft: 0,
            published: 0,
            archived: 0,
          }
        }
        onEdit={handleEditCourse}
        onChangeStatus={handleStatusChange}
        isLoading={courseListQuery.isLoading}
        updatingCourseId={
          changeStatusMutation.isPending
            ? changeStatusMutation.variables?.courseId ?? null
            : null
        }
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <CourseForm
              defaultValues={
                selectedCourse
                  ? {
                      title: selectedCourse.title,
                      description: selectedCourse.description,
                      categoryId: selectedCourse.category.id,
                      difficultyId: selectedCourse.difficulty.id,
                      curriculum: selectedCourse.curriculum,
                    }
                  : undefined
              }
              categories={categories}
              difficultyLevels={difficultyLevels}
              onSubmit={async (values) => {
                await handleFormSubmit(values);
              }}
              onCancel={() => setSheetOpen(false)}
              isSubmitting={
                createCourseMutation.isPending || updateCourseMutation.isPending
              }
              submitLabel={mode === "create" ? "Create course" : "Save changes"}
            />
          </div>
          {mode === "edit" && selectedCourse ? (
            <Card className="mt-6 border-muted">
              <div className="space-y-2 p-4 text-sm text-muted-foreground">
                <p>Current status: {selectedCourse.statusLabel}</p>
                <p>Last updated {selectedCourse.updatedAtRelative}</p>
              </div>
            </Card>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};
