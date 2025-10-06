"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RoleCard } from "@/features/onboarding/components/role-card";
import {
  onboardingFormDefaultValues,
  OnboardingFormSchema,
  type OnboardingFormValues,
  toOnboardingRequestPayload,
} from "@/features/onboarding/lib/form-schema";
import { ROLE_OPTIONS } from "@/features/onboarding/lib/role-options";
import { useOnboardingMutation } from "@/features/onboarding/hooks/useOnboardingMutation";
import type { OnboardingResponse } from "@/features/onboarding/lib/dto";

const phonePlaceholder = "+821012345678";

type OnboardingFormProps = {
  defaultEmail?: string | null;
  onCompleted?: (response: OnboardingResponse) => void | Promise<void>;
};

export const OnboardingForm = ({
  defaultEmail,
  onCompleted,
}: OnboardingFormProps) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useOnboardingMutation();
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingFormSchema),
    defaultValues: {
      ...onboardingFormDefaultValues,
      email: defaultEmail ?? onboardingFormDefaultValues.email,
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (defaultEmail) {
      form.setValue("email", defaultEmail, { shouldValidate: true });
    }
  }, [defaultEmail, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    mutation.reset();

    try {
      const payload = toOnboardingRequestPayload(values);
      const response = await mutation.mutateAsync(payload);

      if (onCompleted) {
        await onCompleted(response);
      }
    } catch (error) {
      const fallbackMessage =
        "온보딩 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setServerError(error instanceof Error ? error.message : fallbackMessage);
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <section className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">역할을 선택하세요</h2>
            <p className="text-sm text-slate-500">
              역할에 따라 제공되는 기능과 대시보드가 달라집니다.
            </p>
          </header>
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="grid gap-4 md:grid-cols-2">
                    {ROLE_OPTIONS.map((option) => (
                      <RoleCard
                        key={option.value}
                        option={option}
                        isSelected={field.value === option.value}
                        onSelect={(value) => {
                          field.onChange(value);
                          form.clearErrors("role");
                        }}
                        disabled={mutation.isPending}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="이름을 입력하세요"
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>휴대전화 번호</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="tel"
                    placeholder={phonePlaceholder}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormDescription>국제전화 형식(E.164)으로 입력하세요.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormDescription>
                  가입 시 사용한 이메일로 계정을 연결합니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <FormField
          control={form.control}
          name="acceptedTerms"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border border-slate-200 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  disabled={mutation.isPending}
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="text-sm font-medium text-slate-800">
                  서비스 이용 약관 및 개인정보 처리방침에 동의합니다.
                </FormLabel>
                <FormDescription>
                  약관에 동의해야 학습자 또는 강사 기능을 이용할 수 있습니다.
                </FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {serverError ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {serverError}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "제출 중..." : "계속하기"}
        </Button>
      </form>
    </Form>
  );
};
