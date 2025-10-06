import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findAuthUserByEmail,
  updateUserRoleMetadata,
} from "@/features/onboarding/backend/supabase-admin";

describe("supabase-admin helpers", () => {
  it("normalizes email before lookup", async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserByEmail: vi.fn(async () => ({
            data: {
              user: {
                id: "user-id",
              },
            },
            error: null,
          })),
        },
      },
    } as unknown as SupabaseClient;

    const result = await findAuthUserByEmail(mockClient, " User@example.com ");

    expect(mockClient.auth.admin.getUserByEmail).toHaveBeenCalledWith(
      "user@example.com"
    );
    expect(result?.id).toBe("user-id");
  });

  it("updates user role metadata", async () => {
    const mockClient = {
      auth: {
        admin: {
          updateUserById: vi.fn(async () => ({ error: null })),
        },
      },
    } as unknown as SupabaseClient;

    await updateUserRoleMetadata(mockClient, "user-id", "learner");

    expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith("user-id", {
      user_metadata: {
        role: "learner",
      },
    });
  });
});
