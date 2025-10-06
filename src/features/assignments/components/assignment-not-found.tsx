"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const messages = {
  forbidden: {
    title: "접근 권한이 없습니다",
    description: "이 과제는 해당 코스를 수강 중인 학습자만 열람할 수 있습니다.",
  },
  notFound: {
    title: "과제를 찾을 수 없습니다",
    description: "요청하신 과제가 존재하지 않거나 아직 공개되지 않았습니다.",
  },
  error: {
    title: "오류가 발생했습니다",
    description: "잠시 후 다시 시도해주세요.",
  },
} as const;

type AssignmentNotFoundProps = {
  variant: keyof typeof messages;
  onRetry?: () => void;
};

export const AssignmentNotFound = ({
  variant,
  onRetry,
}: AssignmentNotFoundProps) => {
  const copy = messages[variant];

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-900">
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <p>{copy.description}</p>
        {onRetry ? (
          <Button type="button" onClick={onRetry} variant="secondary">
            다시 시도하기
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
