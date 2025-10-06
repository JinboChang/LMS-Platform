import { describe, expect, it } from "vitest";
import {
  OnboardingRequestSchema,
  OnboardingResponseSchema,
} from "@/features/onboarding/backend/schema";

describe("OnboardingRequestSchema", () => {
  it("validates a correct payload", () => {
    const result = OnboardingRequestSchema.safeParse({
      email: "learner@example.com",
      name: "홍길동",
      phoneNumber: "+821012345678",
      role: "learner",
      acceptedTerms: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid phone number", () => {
    const result = OnboardingRequestSchema.safeParse({
      email: "learner@example.com",
      name: "홍길동",
      phoneNumber: "010-1234-5678",
      role: "learner",
      acceptedTerms: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects when terms are not accepted", () => {
    const result = OnboardingRequestSchema.safeParse({
      email: "learner@example.com",
      name: "홍길동",
      phoneNumber: "+821012345678",
      role: "learner",
      acceptedTerms: false,
    });

    expect(result.success).toBe(false);
  });
});

describe("OnboardingResponseSchema", () => {
  it("validates a correct response payload", () => {
    const result = OnboardingResponseSchema.safeParse({
      role: "instructor",
      redirectPath: "/instructor/dashboard",
    });

    expect(result.success).toBe(true);
  });

  it("allows minimal payload for existing users", () => {
    const result = OnboardingResponseSchema.safeParse({
      role: "learner",
      redirectPath: "/courses",
    });

    expect(result.success).toBe(true);
  });
});
