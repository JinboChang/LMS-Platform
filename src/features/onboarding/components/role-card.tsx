"use client";

import { memo } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RoleOption } from "@/features/onboarding/lib/role-options";

type RoleCardProps = {
  option: RoleOption;
  isSelected: boolean;
  onSelect: (value: RoleOption["value"]) => void;
  disabled?: boolean;
};

export const RoleCard = memo(function RoleCard({
  option,
  isSelected,
  onSelect,
  disabled = false,
}: RoleCardProps) {
  const handleClick = () => {
    if (disabled) {
      return;
    }

    onSelect(option.value);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "group block h-full w-full text-left disabled:cursor-not-allowed",
        disabled && "opacity-75"
      )}
    >
      <Card
        className={cn(
          "h-full border transition-all",
          isSelected
            ? "border-slate-900 ring-2 ring-slate-900"
            : "border-slate-200 hover:border-slate-400"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              {option.title}
            </CardTitle>
            <p className="text-sm text-slate-500">{option.description}</p>
          </div>
          <span className="text-slate-900">
            {isSelected ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            ) : (
              <Circle className="h-6 w-6" aria-hidden />
            )}
          </span>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Key features
          </p>
          <ul className="space-y-1 text-sm text-slate-600">
            {option.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </button>
  );
});
