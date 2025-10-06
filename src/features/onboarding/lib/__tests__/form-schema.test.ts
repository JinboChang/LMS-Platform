import { describe, expect, it } from "vitest";
import {
  OnboardingFormSchema,
  onboardingFormDefaultValues,
  toOnboardingRequestPayload,
} from "@/features/onboarding/lib/form-schema";

describe("OnboardingFormSchema", () => {
  it("rejects default values before interaction", () => {
    const result = OnboardingFormSchema.safeParse(onboardingFormDefaultValues);
    expect(result.success).toBe(false);
  });

  it("requires role selection", () => {
    const result = OnboardingFormSchema.safeParse({
      email: "student@example.com",
      name: "홍길동",
      phoneNumber: "+821012345678",
      role: undefined,
      acceptedTerms: true,
    });

    expect(result.success).toBe(false);
  });

  it("produces request payload when values are valid", () => {
    const parsed = OnboardingFormSchema.parse({
      email: "student@example.com",
      name: "홍길동",
      phoneNumber: "+821012345678",
      role: "learner",
      acceptedTerms: true,
    });

    const payload = toOnboardingRequestPayload(parsed);

    expect(payload.role).toBe("learner");
    expect(payload.acceptedTerms).toBe(true);
  });
});
