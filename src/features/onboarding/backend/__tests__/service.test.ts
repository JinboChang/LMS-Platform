import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  onboardingErrorCodes,
  type OnboardingServiceError,
} from "@/features/onboarding/backend/error";
import { processOnboarding } from "@/features/onboarding/backend/service";
import type { SupabaseAdmin } from "@/features/onboarding/backend/supabase-admin";

vi.mock("@/features/onboarding/backend/supabase-admin", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/onboarding/backend/supabase-admin")
  >("@/features/onboarding/backend/supabase-admin");

  return {
    ...actual,
    createSupabaseAdmin: vi.fn(),
    findAuthUserByEmail: vi.fn(),
    updateUserRoleMetadata: vi.fn(),
  };
});

const {
  createSupabaseAdmin: mockedCreateAdmin,
  findAuthUserByEmail,
  updateUserRoleMetadata,
} = vi.mocked(
  await import("@/features/onboarding/backend/supabase-admin")
);

type MockReturn<T> = { data: T | null; error: null } | { data: null; error: unknown };

const createSupabaseClient = () => {
  const maybeSingle = vi.fn<[], Promise<MockReturn<Record<string, unknown>>>>();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table === "users") {
      return {
        select,
      } as unknown as ReturnType<SupabaseClient["from"]>;
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    client: { from } as unknown as SupabaseClient,
    fns: { maybeSingle },
  };
};

describe("processOnboarding", () => {
  const payload = {
    email: "user@example.com",
    name: "홍길동",
    phoneNumber: "+821012345678",
    role: "learner",
    acceptedTerms: true,
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createAdminMock = () => {
    const adminMock: SupabaseAdmin = {
      createUserWithSession: vi.fn(),
      deleteUserById: vi.fn(),
      ensureProfile: vi.fn(),
      updateUserMetadata: vi.fn(),
    };

    mockedCreateAdmin.mockReturnValue(adminMock);

    return adminMock;
  };

  it("returns success response when profile is created for existing user", async () => {
    const { client, fns } = createSupabaseClient();
    const adminMock = createAdminMock();

    findAuthUserByEmail.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
    } as never);

    fns.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    adminMock.ensureProfile.mockResolvedValueOnce({
      id: "22222222-2222-2222-2222-222222222222",
      auth_user_id: "00000000-0000-0000-0000-000000000000",
      email: payload.email,
      name: payload.name,
      phone_number: payload.phoneNumber,
      role: payload.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await processOnboarding({ supabase: client }, payload);

    if (!result.ok) {
      throw new Error(JSON.stringify(result));
    }

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.redirectPath).toBe("/courses");
      expect(result.data.accessToken).toBeUndefined();
    }
    expect(adminMock.createUserWithSession).not.toHaveBeenCalled();
    expect(updateUserRoleMetadata).toHaveBeenCalled();
  });

  it("creates auth user when none exists", async () => {
    const { client, fns } = createSupabaseClient();
    const adminMock = createAdminMock();

    findAuthUserByEmail.mockResolvedValueOnce(null);
    fns.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    adminMock.createUserWithSession.mockResolvedValueOnce({
      user: {
        id: "11111111-1111-1111-1111-111111111111",
      } as never,
      session: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "11111111-1111-1111-1111-111111111111",
        },
      } as never,
    });

    adminMock.ensureProfile.mockResolvedValueOnce({
      id: "33333333-3333-3333-3333-333333333333",
      auth_user_id: "11111111-1111-1111-1111-111111111111",
      email: payload.email,
      name: payload.name,
      phone_number: payload.phoneNumber,
      role: payload.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await processOnboarding({ supabase: client }, payload);

    if (!result.ok) {
      throw new Error(JSON.stringify(result));
    }

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.accessToken).toBe("access-token");
      expect(result.data.refreshToken).toBe("refresh-token");
    }
    expect(adminMock.createUserWithSession).toHaveBeenCalled();
  });

  it("fails when profile already exists", async () => {
    const { client, fns } = createSupabaseClient();
    createAdminMock();

    findAuthUserByEmail.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
    } as never);

    fns.maybeSingle.mockResolvedValueOnce({
      data: { id: "44444444-4444-4444-4444-444444444444" },
      error: null,
    });

    const result = await processOnboarding({ supabase: client }, payload);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(
        onboardingErrorCodes.profileAlreadyExists
      );
    }
  });
});
