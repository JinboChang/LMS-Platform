"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ReportActionResultStatus = "success" | "error" | "info";

const statusConfig: Record<ReportActionResultStatus, {
  icon: typeof CheckCircle2;
  className: string;
}> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  error: {
    icon: AlertCircle,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  info: {
    icon: Info,
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
};

type ReportActionResultProps = {
  status: ReportActionResultStatus;
  message: string;
};

export const ReportActionResult = ({ status, message }: ReportActionResultProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        config.className,
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
};

