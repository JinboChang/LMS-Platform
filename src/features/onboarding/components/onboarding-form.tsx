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
        "We ran into a problem completing onboarding. Please try again.";
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
            <h2 className="text-xl font-semibold text-slate-900">Choose your role</h2>
            <p className="text-sm text-slate-500">
              Features and dashboards change based on your role.
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
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your name"
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
                <FormLabel>Mobile number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="tel"
                    placeholder={phonePlaceholder}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormDescription>Use international (E.164) format.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Email</FormLabel>
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
                  We connect your account using the email you signed up with.
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
                  I agree to the Terms of Service and Privacy Policy.
                </FormLabel>
                <FormDescription>
                  You must agree to use learner or instructor features.
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
          {mutation.isPending ? "Submitting..." : "Continue"}
        </Button>
      </form>
    </Form>
  );
};
