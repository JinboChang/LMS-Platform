"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ReportActionResult } from "@/features/operator/components/report-action-result";
import { useOperatorReportDetail } from "@/features/operator/hooks/useReportDetail";
import { useOperatorReportAction } from "@/features/operator/hooks/useReportAction";
import { useOperatorStore } from "@/features/operator/hooks/useOperatorStore";
import {
  OperatorReportProcessFormSchema,
  type OperatorReportProcessFormValues,
} from "@/features/operator/lib/validators";
import {
  OperatorReportActionTypeSchema,
  OperatorReportStatusSchema,
  OperatorReportStatusLabelMap,
  type OperatorReportAction,
} from "@/features/operator/lib/dto";
import {
  REPORT_ACTION_LABELS,
  REPORT_ACTION_NOTE_MAX_LENGTH,
  REPORT_ACTION_NOTE_MIN_LENGTH,
  REPORT_TARGET_LABELS,
} from "@/features/operator/constants";

const formatDateTime = (value: string) => {
  const parsed = parseISO(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, "yyyy-MM-dd HH:mm");
};

const statusOptions = OperatorReportStatusSchema.options.map((status) => ({
  value: status,
  label: OperatorReportStatusLabelMap[status],
}));

const actionOptions = OperatorReportActionTypeSchema.options.map((action) => ({
  value: action,
  label: REPORT_ACTION_LABELS[action],
}));

export const ReportDetailDrawer = () => {
  const {
    selectedReportId,
    setSelectedReportId,
  } = useOperatorStore();

  const detailQuery = useOperatorReportDetail(selectedReportId);

  const report = detailQuery.data;

  const form = useForm<OperatorReportProcessFormValues>({
    resolver: zodResolver(OperatorReportProcessFormSchema),
    defaultValues: {
      status: report?.status ?? "investigating",
      actionType: actionOptions[0]?.value ?? "warning",
      actionDetails: "",
    },
  });

  useEffect(() => {
    if (!report) {
      return;
    }

    form.reset({
      status: report.status,
      actionType: actionOptions[0]?.value ?? "warning",
      actionDetails: "",
    });
  }, [report, form]);

  const actionMutation = useOperatorReportAction({
    reportId: selectedReportId ?? "",
    currentStatus: report?.status ?? "received",
  });

  useEffect(() => {
    if (actionMutation.isSuccess) {
      setSelectedReportId(null);
    }
  }, [actionMutation.isSuccess, setSelectedReportId]);

  const handleClose = () => {
    if (actionMutation.isPending) {
      return;
    }
    setSelectedReportId(null);
  };

  const onSubmit = (values: OperatorReportProcessFormValues) => {
    if (!selectedReportId) {
      return;
    }

    actionMutation.mutate(values);
  };

  const actions = useMemo(
    () => report?.actions ?? [],
    [report?.actions],
  );

  return (
    <Sheet open={selectedReportId !== null} onOpenChange={handleClose}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-hidden border-l bg-background p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-6">
          <SheetTitle>신고 상세</SheetTitle>
          <SheetDescription>
            신고 내용을 검토하고 적절한 조치를 기록하세요.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {detailQuery.isLoading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              데이터를 불러오는 중입니다.
            </div>
          ) : null}

          {detailQuery.isError ? (
            <ReportActionResult
              status="error"
              message={
                detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : "신고 상세 정보를 가져오지 못했습니다."
              }
            />
          ) : null}

          {report ? (
            <div className="flex flex-col gap-6">
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {REPORT_TARGET_LABELS[report.target.type]}
                  </Badge>
                  <Badge variant="default">
                    {OperatorReportStatusLabelMap[report.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    신고일 {formatDateTime(report.reportedAt)}
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {report.reason}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    신고자 {report.reporter.name} · {report.reporter.email}
                  </p>
                </div>
                {report.details ? (
                  <p className="rounded-md bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
                    {report.details}
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">조치 기록</h4>
                {actions.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    아직 등록된 조치가 없습니다.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {actions.map((action: OperatorReportAction) => (
                      <div
                        key={action.id}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {REPORT_ACTION_LABELS[action.actionType]}
                          </Badge>
                          <span>{action.actionedBy.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(action.actionedAt)}
                          </span>
                        </div>
                        {action.actionDetails ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {action.actionDetails}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {report.status === "resolved" ? (
                <ReportActionResult
                  status="info"
                  message="이미 처리 완료된 신고입니다. 추가 조치를 기록하려면 상태를 다시 변경할 수 없습니다."
                />
              ) : (
                <section className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">신고 처리</h4>
                    <p className="text-xs text-muted-foreground">
                      상태와 조치 유형을 선택하고 처리 메모를 남겨주세요.
                    </p>
                  </div>

                  <Form {...form}>
                    <form
                      className="space-y-4"
                      onSubmit={form.handleSubmit(onSubmit)}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>상태</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="상태 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="actionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>조치 유형</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="조치 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {actionOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="actionDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>처리 메모</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="처리 결과와 참고 사항을 입력하세요."
                                minLength={REPORT_ACTION_NOTE_MIN_LENGTH}
                                maxLength={REPORT_ACTION_NOTE_MAX_LENGTH}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {actionMutation.isError ? (
                        <ReportActionResult
                          status="error"
                          message={
                            actionMutation.error instanceof Error
                              ? actionMutation.error.message
                              : "신고 처리를 완료하지 못했습니다."
                          }
                        />
                      ) : null}

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={actionMutation.isPending}
                      >
                        {actionMutation.isPending ? "처리 중..." : "조치 기록"}
                      </Button>
                    </form>
                  </Form>
                </section>
              )}
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t p-4">
          <Button variant="ghost" onClick={handleClose} disabled={actionMutation.isPending}>
            닫기
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
