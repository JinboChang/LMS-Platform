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
    .refine((value) => value, "You must agree to the terms."),
}).superRefine((data, ctx) => {
  if (!data.role) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a role to continue.",
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
    throw new Error("Select a role to continue.");
  }

  if (!values.acceptedTerms) {
    throw new Error("You must agree to the terms before onboarding.");
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
