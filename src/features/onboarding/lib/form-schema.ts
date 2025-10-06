import { z } from "zod";
import {
  OnboardingRequestSchema,
  onboardingRoles,
  type OnboardingRequest,
} from "@/features/onboarding/lib/dto";

const optionalRoleSchema = z.enum(onboardingRoles).optional();

export const OnboardingFormSchema = OnboardingRequestSchema.extend({
  role: optionalRoleSchema,
  acceptedTerms: z
    .boolean()
    .refine((value) => value, "약관에 동의해야 합니다."),
}).superRefine((data, ctx) => {
  if (!data.role) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "역할을 선택해 주세요.",
      path: ["role"],
    });
  }
});

export type OnboardingFormValues = z.input<typeof OnboardingFormSchema>;

export const onboardingFormDefaultValues: OnboardingFormValues = {
  email: "",
  name: "",
  phoneNumber: "",
  role: undefined,
  acceptedTerms: false,
};

export const toOnboardingRequestPayload = (
  values: OnboardingFormValues,
): OnboardingRequest => {
  if (!values.role) {
    throw new Error("역할을 선택해 주세요.");
  }

  if (!values.acceptedTerms) {
    throw new Error("약관에 동의해야 온보딩을 진행할 수 있습니다.");
  }

  return {
    email: values.email.trim(),
    name: values.name.trim(),
    phoneNumber: values.phoneNumber.trim(),
    role: values.role,
    acceptedTerms: true,
  } satisfies OnboardingRequest;
};

export const onboardingRoleValues = onboardingRoles;
