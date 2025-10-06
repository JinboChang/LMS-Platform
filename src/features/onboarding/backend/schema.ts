import { z } from "zod";

export const onboardingRoles = ["learner", "instructor"] as const;

const e164RegExp = /^\+[1-9]\d{1,14}$/;

export const OnboardingRequestSchema = z
  .object({
    email: z
      .string({ required_error: "이메일을 입력해 주세요." })
      .trim()
      .min(1, "이메일을 입력해 주세요.")
      .email("유효한 이메일 주소가 아닙니다."),
    name: z
      .string({ required_error: "이름을 입력해 주세요." })
      .trim()
      .min(1, "이름을 입력해 주세요."),
    phoneNumber: z
      .string({ required_error: "휴대전화 번호를 입력해 주세요." })
      .trim()
      .regex(e164RegExp, "국제전화 형식(E.164)으로 입력해 주세요. 예: +821012345678"),
    role: z.enum(onboardingRoles, {
      errorMap: () => ({ message: "올바른 역할을 선택해 주세요." }),
    }),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "약관에 동의해 주세요." }),
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
