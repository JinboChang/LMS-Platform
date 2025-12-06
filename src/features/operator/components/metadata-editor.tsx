"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useOperatorCategories } from "@/features/operator/hooks/useCategories";
import { useOperatorDifficultyLevels } from "@/features/operator/hooks/useDifficultyLevels";
import type {
  OperatorCategory,
  OperatorDifficulty,
} from "@/features/operator/lib/dto";
import {
  OperatorCategoryFormSchema,
  OperatorDifficultyFormSchema,
  type OperatorCategoryFormValues,
  type OperatorDifficultyFormValues,
} from "@/features/operator/lib/validators";

const defaultCategoryValues: OperatorCategoryFormValues = {
  name: "",
  isActive: true,
};

const defaultDifficultyValues: OperatorDifficultyFormValues = {
  label: "",
  isActive: true,
};

const renderActiveBadge = (isActive: boolean) => (
  <Badge variant={isActive ? "default" : "outline"}>
    {isActive ? "Active" : "Inactive"}
  </Badge>
);

export const MetadataEditor = () => {
  const {
    categoriesQuery,
    createCategory,
    updateCategory,
  } = useOperatorCategories();
  const {
    difficultyQuery,
    createDifficulty,
    updateDifficulty,
  } = useOperatorDifficultyLevels();

  const categoryForm = useForm<OperatorCategoryFormValues>({
    resolver: zodResolver(OperatorCategoryFormSchema),
    defaultValues: defaultCategoryValues,
  });

  const difficultyForm = useForm<OperatorDifficultyFormValues>({
    resolver: zodResolver(OperatorDifficultyFormSchema),
    defaultValues: defaultDifficultyValues,
  });

  const [editingCategory, setEditingCategory] = useState<OperatorCategory | null>(null);
  const [editingDifficulty, setEditingDifficulty] = useState<OperatorDifficulty | null>(null);

  const submitCategory = (values: OperatorCategoryFormValues) => {
    createCategory.mutate(values, {
      onSuccess: () => {
        categoryForm.reset(defaultCategoryValues);
      },
    });
  };

  const submitDifficulty = (values: OperatorDifficultyFormValues) => {
    createDifficulty.mutate(values, {
      onSuccess: () => {
        difficultyForm.reset(defaultDifficultyValues);
      },
    });
  };

  const handleRenameCategory = (category: OperatorCategory) => {
    setEditingCategory(category);
  };

  const handleRenameDifficulty = (difficulty: OperatorDifficulty) => {
    setEditingDifficulty(difficulty);
  };

  const saveCategoryRename = () => {
    if (!editingCategory) {
      return;
    }

    updateCategory.mutate(
      {
        categoryId: editingCategory.id,
        values: {
          name: editingCategory.name,
          isActive: editingCategory.isActive,
        },
      },
      {
        onSuccess: () => setEditingCategory(null),
      },
    );
  };

  const saveDifficultyRename = () => {
    if (!editingDifficulty) {
      return;
    }

    updateDifficulty.mutate(
      {
        difficultyId: editingDifficulty.id,
        values: {
          label: editingDifficulty.label,
          isActive: editingDifficulty.isActive,
        },
      },
      {
        onSuccess: () => setEditingDifficulty(null),
      },
    );
  };

  const toggleCategoryActive = (category: OperatorCategory) => {
    updateCategory.mutate({
      categoryId: category.id,
      values: {
        name: category.name,
        isActive: !category.isActive,
      },
    });
  };

  const toggleDifficultyActive = (difficulty: OperatorDifficulty) => {
    updateDifficulty.mutate({
      difficultyId: difficulty.id,
      values: {
        label: difficulty.label,
        isActive: !difficulty.isActive,
      },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Course categories</h3>
          <p className="text-sm text-muted-foreground">
            Manage categories used across courses and reports.
          </p>
        </div>

        <Form {...categoryForm}>
          <form
            className="grid gap-4 rounded-md border border-dashed p-4"
            onSubmit={categoryForm.handleSubmit(submitCategory)}
          >
            <FormField
              control={categoryForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Computer Science" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={categoryForm.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-sm">Active status</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Inactive categories remain hidden from course and report filters.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending ? "Saving..." : "Add category"}
            </Button>
          </form>
        </Form>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Categories</h4>
          <div className="flex flex-col gap-3">
            {categoriesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            ) : null}
            {categoriesQuery.isError ? (
              <p className="text-sm text-destructive">
                Failed to load categories.
              </p>
            ) : null}
            {categoriesQuery.isSuccess && categoriesQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories added yet.</p>
            ) : null}

            {categoriesQuery.isSuccess
              ? categoriesQuery.data.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {category.id === editingCategory?.id ? (
                            <Input
                              value={editingCategory.name}
                              onChange={(event) =>
                                setEditingCategory((prev) =>
                                  prev ? { ...prev, name: event.target.value } : prev,
                                )
                              }
                            />
                          ) : (
                            category.name
                          )}
                        </span>
                        {renderActiveBadge(category.isActive)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDateFromString(category.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {category.id === editingCategory?.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={saveCategoryRename}
                            disabled={updateCategory.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRenameCategory(category)}
                          >
                            Rename
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleCategoryActive(category)}
                          >
                            {category.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              : null}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Course difficulty</h3>
          <p className="text-sm text-muted-foreground">
            Manage difficulty labels that appear on courses and reports.
          </p>
        </div>

        <Form {...difficultyForm}>
          <form
            className="grid gap-4 rounded-md border border-dashed p-4"
            onSubmit={difficultyForm.handleSubmit(submitDifficulty)}
          >
            <FormField
              control={difficultyForm.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Beginner" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={difficultyForm.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-sm">Active status</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Inactive difficulties are hidden from course settings and filters.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={createDifficulty.isPending}>
              {createDifficulty.isPending ? "Saving..." : "Add difficulty"}
            </Button>
          </form>
        </Form>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Difficulties</h4>
          <div className="flex flex-col gap-3">
            {difficultyQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading difficulties...</p>
            ) : null}
            {difficultyQuery.isError ? (
              <p className="text-sm text-destructive">
                Failed to load difficulties.
              </p>
            ) : null}
            {difficultyQuery.isSuccess && difficultyQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No difficulties added yet.</p>
            ) : null}

            {difficultyQuery.isSuccess
              ? difficultyQuery.data.map((difficulty) => (
                  <div
                    key={difficulty.id}
                    className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {difficulty.id === editingDifficulty?.id ? (
                            <Input
                              value={editingDifficulty.label}
                              onChange={(event) =>
                                setEditingDifficulty((prev) =>
                                  prev ? { ...prev, label: event.target.value } : prev,
                                )
                              }
                            />
                          ) : (
                            difficulty.label
                          )}
                        </span>
                        {renderActiveBadge(difficulty.isActive)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDateFromString(difficulty.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {difficulty.id === editingDifficulty?.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={saveDifficultyRename}
                            disabled={updateDifficulty.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDifficulty(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRenameDifficulty(difficulty)}
                          >
                            Rename
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleDifficultyActive(difficulty)}
                          >
                            {difficulty.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              : null}
          </div>
        </div>
      </Card>
    </div>
  );
};

const formatDateFromString = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};
