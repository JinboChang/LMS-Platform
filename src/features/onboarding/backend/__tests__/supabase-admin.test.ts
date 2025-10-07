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
          listUsers: vi.fn(async () => ({
            data: {
              users: [
                {
                  id: "user-id",
                  email: "user@example.com",
                },
              ],
              nextPage: null,
            },
            error: null,
          })),
        },
      },
    } as unknown as SupabaseClient;

    const result = await findAuthUserByEmail(mockClient, " User@example.com ");

    expect(mockClient.auth.admin.listUsers).toHaveBeenCalledWith({
      page: 1,
      perPage: 200,
    });
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
