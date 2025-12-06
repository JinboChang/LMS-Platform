import { z } from "zod";

export const onboardingRoles = ["learner", "instructor"] as const;

const e164RegExp = /^\+[1-9]\d{1,14}$/;

export const OnboardingRequestSchema = z
  .object({
    email: z
      .string({ required_error: "Please enter your email." })
      .trim()
      .min(1, "Please enter your email.")
      .email("Email address is invalid."),
    name: z
      .string({ required_error: "Please enter your name." })
      .trim()
      .min(1, "Please enter your name."),
    phoneNumber: z
      .string({ required_error: "Please enter your mobile number." })
      .trim()
      .regex(e164RegExp, "Use international format (E.164). Example: +821012345678"),
    role: z.enum(onboardingRoles, {
      errorMap: () => ({ message: "Please select a valid role." }),
    }),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "Please agree to the terms." }),
    }),
  })
  .strict();

export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>;

export const OnboardingResponseSchema = z
  .object({
    role: z.enum(onboardingRoles),
    redirectPath: z.string().min(1),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresIn: z.number().int().positive().optional(),
    expiresAt: z.string().min(1).optional(),
  })
  .strict();

export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;

export const OnboardingProfileRowSchema = z
  .object({
    id: z.string().uuid(),
    auth_user_id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1),
    phone_number: z.string().min(1),
    role: z.enum(onboardingRoles),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export type OnboardingProfileRow = z.infer<typeof OnboardingProfileRowSchema>;
