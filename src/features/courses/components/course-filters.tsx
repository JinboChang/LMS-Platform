'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CourseListQueryDto,
  CourseListResponseDto,
} from '@/features/courses/lib/dto';
import {
  CourseFilterFormSchema,
  createInitialCourseFilters,
  type CourseFilterFormValues,
} from '@/features/courses/lib/filter-options';

export type CourseFiltersProps = {
  filters: CourseListResponseDto['filters'] | null;
  onSubmit: (values: CourseFilterFormValues) => void;
  isSubmitting?: boolean;
  defaultValues?: CourseFilterFormValues;
};

export const CourseFilters = ({
  filters,
  onSubmit,
  isSubmitting = false,
  defaultValues,
}: CourseFiltersProps) => {
  const form = useForm<CourseFilterFormValues>({
    resolver: zodResolver(CourseFilterFormSchema),
    defaultValues: defaultValues ?? createInitialCourseFilters(),
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
  });

  const handleReset = () => {
    const initial = createInitialCourseFilters();
    form.reset(initial);
    onSubmit(initial);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end"
    >
      <label className="flex flex-1 flex-col gap-2 text-xs font-medium text-slate-600">
        검색어
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="코스명 또는 설명으로 검색"
            {...form.register('search')}
            className="pl-9"
          />
        </div>
      </label>

      <label className="flex w-full flex-col gap-2 text-xs font-medium text-slate-600 md:w-40">
        카테고리
        <Select
          value={form.watch('categoryId') ?? 'all'}
          onValueChange={(value) =>
            form.setValue('categoryId', value === 'all' ? '' : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {filters?.categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex w-full flex-col gap-2 text-xs font-medium text-slate-600 md:w-40">
        난이도
        <Select
          value={form.watch('difficultyId') ?? 'all'}
          onValueChange={(value) =>
            form.setValue('difficultyId', value === 'all' ? '' : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {filters?.difficultyLevels.map((difficulty) => (
              <SelectItem key={difficulty.id} value={difficulty.id}>
                {difficulty.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex w-full flex-col gap-2 text-xs font-medium text-slate-600 md:w-40">
        정렬
        <Select
          value={form.watch('sort') ?? 'latest'}
          onValueChange={(value) =>
            form.setValue(
              'sort',
              value as NonNullable<CourseListQueryDto['sort']>,
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="정렬 방식을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {(filters?.sortOptions ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting} className="gap-1">
          <SlidersHorizontal className="h-4 w-4" />
          적용
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSubmitting}
        >
          초기화
        </Button>
      </div>
    </form>
  );
};
