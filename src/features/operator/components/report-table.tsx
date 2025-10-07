"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useDebounce } from "react-use";
import { format, parseISO } from "date-fns";
import { AlertCircle, Filter, Search, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useOperatorReports } from "@/features/operator/hooks/useReports";
import { useOperatorStore } from "@/features/operator/hooks/useOperatorStore";
import {
  OperatorReportStatusLabelMap,
  type OperatorReportFilter,
  type OperatorReportSummary,
} from "@/features/operator/lib/dto";
import {
  REPORT_STATUSES,
  REPORT_TARGET_LABELS,
  REPORT_TARGET_TYPES,
} from "@/features/operator/constants";
import { useQueryClient } from "@tanstack/react-query";

const formatDateTime = (value: string) => {
  const parsed = parseISO(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, "yyyy-MM-dd HH:mm");
};

const buildPlaceholderImage = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/96/96`;

const STATUS_VARIANTS: Record<string, string> = {
  received: "border-l-4 border-yellow-500 bg-yellow-500/5",
  investigating: "border-l-4 border-blue-500 bg-blue-500/5",
  resolved: "border-l-4 border-emerald-500 bg-emerald-500/5",
};

const targetOptions = REPORT_TARGET_TYPES.map((target) => ({
  value: target,
  label: REPORT_TARGET_LABELS[target],
}));

const SELECT_ALL_VALUE = "__all__";

const statusOptions = REPORT_STATUSES.map((status) => ({
  value: status,
  label: OperatorReportStatusLabelMap[status],
}));

const emptyFilters: OperatorReportFilter = {};

export const ReportTable = () => {
  const queryClient = useQueryClient();
  const {
    filters,
    updateFilters,
    setSelectedReportId,
    selectedReportId,
  } = useOperatorStore();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  useDebounce(
    () => {
      updateFilters((prev) => {
        const nextSearch = searchInput.trim();

        const next: OperatorReportFilter = {
          ...prev,
          search: nextSearch.length > 0 ? nextSearch : undefined,
        };

        if (!next.search) {
          delete next.search;
        }

        return next;
      });
    },
    350,
    [searchInput],
  );

  const filtersForQuery = useMemo(() => filters, [filters]);
  const reportsQuery = useOperatorReports(filtersForQuery);
  const reports = reportsQuery.data?.reports ?? [];

  const handleStatusChange = (value: string) => {
    updateFilters((prev) => {
      const next: OperatorReportFilter = {
        ...prev,
        status:
          value === SELECT_ALL_VALUE
            ? undefined
            : (value as OperatorReportFilter["status"]),
      };

      if (!next.status) {
        delete next.status;
      }

      return next;
    });
  };

  const handleTargetChange = (value: string) => {
    updateFilters((prev) => {
      const next: OperatorReportFilter = {
        ...prev,
        targetType:
          value === SELECT_ALL_VALUE
            ? undefined
            : (value as OperatorReportFilter["targetType"]),
      };

      if (!next.targetType) {
        delete next.targetType;
      }

      return next;
    });
  };

  const resetFilters = () => {
    updateFilters(() => emptyFilters);
    setSearchInput("");
    queryClient.invalidateQueries({
      queryKey: ["operator", "reports"],
      exact: false,
    }).catch(() => {
      // ignore
    });
  };

  const renderRow = (report: OperatorReportSummary) => {
    const variantClass = STATUS_VARIANTS[report.status] ?? "";
    const isSelected = report.id === selectedReportId;

    return (
      <button
        key={report.id}
        type="button"
        onClick={() => setSelectedReportId(report.id)}
        className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition hover:border-primary/60 hover:bg-muted ${variantClass} ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background"}`}
      >
        <Image
          src={buildPlaceholderImage(report.id)}
          alt="신고 썸네일 이미지"
          width={96}
          height={96}
          className="h-16 w-16 rounded-md object-cover"
        />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="uppercase tracking-wide">
              {REPORT_TARGET_LABELS[report.target.type]}
            </Badge>
            <Badge>{OperatorReportStatusLabelMap[report.status]}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(report.reportedAt)} 신고
            </span>
            {report.actionCount > 0 ? (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                {report.actionCount}건 조치
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">
              {report.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              신고자 {report.reporter.name} · {report.reporter.email}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5" /> 운영 신고 관리
          </div>
          <p className="text-sm text-muted-foreground">
            신고 상태와 유형을 필터링해 자세한 정보를 확인하고 조치하세요.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex w-full items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              placeholder="사유 또는 신고자를 검색하세요"
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            초기화
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> 필터
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="status-filter">상태</Label>
            <Select
              value={filters.status ?? SELECT_ALL_VALUE}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_ALL_VALUE}>전체</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="target-filter">신고 대상</Label>
            <Select
              value={filters.targetType ?? SELECT_ALL_VALUE}
              onValueChange={handleTargetChange}
            >
              <SelectTrigger id="target-filter">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_ALL_VALUE}>전체</SelectItem>
                {targetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {reportsQuery.isLoading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Shield className="h-6 w-6 animate-spin" />
          신고 데이터를 불러오는 중입니다.
        </div>
      ) : null}

      {reportsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>
            {reportsQuery.error instanceof Error
              ? reportsQuery.error.message
              : "신고 목록을 불러오지 못했어요."}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reportsQuery.refetch()}
          >
            다시 시도
          </Button>
        </div>
      ) : null}

      {reportsQuery.isSuccess && reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">표시할 신고가 없습니다.</p>
            <p className="text-xs text-muted-foreground">
              필터 조건을 조정하거나 다른 키워드로 검색해보세요.
            </p>
          </div>
        </div>
      ) : null}

      {reportsQuery.isSuccess && reports.length > 0 ? (
        <div className="grid gap-3">
          {reports.map(renderRow)}
        </div>
      ) : null}
    </Card>
  );
};

