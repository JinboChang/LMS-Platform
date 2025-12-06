"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const messages = {
  forbidden: {
    title: "Access denied",
    description: "Only learners enrolled in this course can view this assignment.",
  },
  notFound: {
    title: "Assignment not found",
    description: "The assignment does not exist or is not published yet.",
  },
  error: {
    title: "An error occurred",
    description: "Please try again in a moment.",
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
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
