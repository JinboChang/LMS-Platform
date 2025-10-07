import { describe, expect, it } from "vitest";
import { GradeSubmissionFormSchema } from "@/features/instructor-grading/lib/validators";

describe("GradeSubmissionFormSchema", () => {
  it("accepts valid payload", () => {
    const result = GradeSubmissionFormSchema.safeParse({
      score: 95,
      feedbackText: "Great job!",
      requireResubmission: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects scores outside the allowed range", () => {
    const result = GradeSubmissionFormSchema.safeParse({
      score: 120,
      feedbackText: "",
      requireResubmission: false,
    });

    expect(result.success).toBe(false);
  });

  it("requires feedback when requesting resubmission", () => {
    const result = GradeSubmissionFormSchema.safeParse({
      score: 55,
      requireResubmission: true,
      feedbackText: "",
    });

    expect(result.success).toBe(false);
  });
});
