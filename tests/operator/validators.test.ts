import { describe, expect, it } from "vitest";
import {
  OperatorCategoryFormSchema,
  OperatorDifficultyFormSchema,
  OperatorReportProcessFormSchema,
} from "@/features/operator/lib/validators";

describe("Operator report process form schema", () => {
  it("필수 필드를 모두 채우면 통과해야 한다", () => {
    const result = OperatorReportProcessFormSchema.safeParse({
      status: "investigating",
      actionType: "warning",
      actionDetails: "조치 내역",
    });

    expect(result.success).toBe(true);
  });

  it("resolved 상태에서는 actionDetails가 필요하다", () => {
    const result = OperatorReportProcessFormSchema.safeParse({
      status: "resolved",
      actionType: "warning",
      actionDetails: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("Operator category form schema", () => {
  it("유효한 카테고리명과 활성 상태를 허용한다", () => {
    const result = OperatorCategoryFormSchema.safeParse({
      name: "AI",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("너무 짧은 카테고리명은 거부해야 한다", () => {
    const result = OperatorCategoryFormSchema.safeParse({
      name: "A",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("Operator difficulty form schema", () => {
  it("난이도 레이블이 없는 경우 거부한다", () => {
    const result = OperatorDifficultyFormSchema.safeParse({
      label: "",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("유효한 난이도 정보를 허용한다", () => {
    const result = OperatorDifficultyFormSchema.safeParse({
      label: "Intermediate",
      isActive: false,
    });

    expect(result.success).toBe(true);
  });
});

