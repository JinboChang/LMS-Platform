import { randomBytes } from "node:crypto";
import type {
  AuthError,
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";
import { onboardingErrorCodes } from "@/features/onboarding/backend/error";
import type { OnboardingProfileRow } from "@/features/onboarding/backend/schema";

const USERS_TABLE = "users";

const generatePassword = () => randomBytes(16).toString("base64url");

export type CreateUserWithSessionInput = {
  email: string;
  name: string;
  phoneNumber: string;
  role: string;
};

export type CreateUserWithSessionResult = {
  user: User;
  session: Session;
};

export class SupabaseAdminError extends Error {
  constructor(
    message: string,
    public readonly code:
      | typeof onboardingErrorCodes.emailAlreadyExists
      | typeof onboardingErrorCodes.authCreateFailed
      | typeof onboardingErrorCodes.sessionCreateFailed
      | typeof onboardingErrorCodes.profileInsertFailed
      | typeof onboardingErrorCodes.profileValidationFailed
      | typeof onboardingErrorCodes.profileRollbackFailed,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "SupabaseAdminError";
  }
}

export type SupabaseAdmin = {
  createUserWithSession: (
    input: CreateUserWithSessionInput
  ) => Promise<CreateUserWithSessionResult>;
  deleteUserById: (userId: string) => Promise<void>;
  ensureProfile: (
    input: Omit<OnboardingProfileRow, "id" | "created_at" | "updated_at">
  ) => Promise<OnboardingProfileRow>;
  updateUserMetadata: (userId: string, role: string) => Promise<void>;
};

export const createSupabaseAdmin = (
  client: SupabaseClient
): SupabaseAdmin => {
  const createUserWithSession = async (
    input: CreateUserWithSessionInput
  ): Promise<CreateUserWithSessionResult> => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const password = generatePassword();

    const { data: created, error: createError } = await client.auth.admin
      .createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: input.name,
          phoneNumber: input.phoneNumber,
          role: input.role,
        },
      })
      .catch((error: AuthError) => ({ data: null, error }));

    if (createError) {
      const isConflict =
        createError.status === 409 || createError.code === "already_registered";

      if (isConflict) {
        throw new SupabaseAdminError(
          "이미 가입된 이메일입니다.",
          onboardingErrorCodes.emailAlreadyExists,
          createError
        );
      }

      throw new SupabaseAdminError(
        "Supabase 사용자 생성에 실패했습니다.",
        onboardingErrorCodes.authCreateFailed,
        createError
      );
    }

    if (!created?.user) {
      throw new SupabaseAdminError(
        "Supabase 사용자 정보를 가져오지 못했습니다.",
        onboardingErrorCodes.authCreateFailed
      );
    }

    const { data: sessionData, error: sessionError } = await client.auth
      .signInWithPassword({
        email: normalizedEmail,
        password,
      })
      .catch((error: AuthError) => ({ data: null, error }));

    if (sessionError || !sessionData?.session) {
      throw new SupabaseAdminError(
        "세션 토큰을 발급하지 못했습니다.",
        onboardingErrorCodes.sessionCreateFailed,
        sessionError
      );
    }

    return {
      user: created.user,
      session: sessionData.session,
    } satisfies CreateUserWithSessionResult;
  };

  const deleteUserById = async (userId: string) => {
    const { error } = await client.auth.admin.deleteUser(userId);

    if (error) {
      throw new SupabaseAdminError(
        "생성된 사용자를 정리하지 못했습니다.",
        onboardingErrorCodes.profileRollbackFailed,
        error
      );
    }
  };

  const ensureProfile = async (
    input: Omit<OnboardingProfileRow, "id" | "created_at" | "updated_at">
  ) => {
    const { data, error } = await client
      .from(USERS_TABLE)
      .insert({
        auth_user_id: input.auth_user_id,
        email: input.email,
        name: input.name,
        phone_number: input.phone_number,
        role: input.role,
      })
      .select(
        "id, auth_user_id, email, name, phone_number, role, created_at, updated_at"
      )
      .single<OnboardingProfileRow>();

    if (error) {
      throw new SupabaseAdminError(
        "온보딩 프로필을 저장하지 못했습니다.",
        onboardingErrorCodes.profileInsertFailed,
        error
      );
    }

    return data;
  };

  const updateUserMetadata = async (userId: string, role: string) => {
    const { error } = await client.auth.admin.updateUserById(userId, {
      user_metadata: {
        role,
      },
    });

    if (error) {
      throw new SupabaseAdminError(
        "사용자 메타데이터를 업데이트하지 못했습니다.",
        onboardingErrorCodes.profileValidationFailed,
        error
      );
    }
  };

  return {
    createUserWithSession,
    deleteUserById,
    ensureProfile,
    updateUserMetadata,
  } satisfies SupabaseAdmin;
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const findAuthUserByEmail = async (
  client: SupabaseClient,
  email: string
): Promise<User | null> => {
  const normalizedEmail = normalizeEmail(email);
  const perPage = 200;
  let page = 1;

  // Supabase Admin API는 이메일 조회 전용 메서드를 제공하지 않으므로
  // 페이지네이션을 돌며 일치하는 이메일을 탐색한다.
  while (true) {
    const result = await client.auth.admin.listUsers({ page, perPage });

    if (result.error) {
      throw result.error;
    }

    const users = result.data.users ?? [];
    const matchedUser = users.find((user) =>
      user.email?.toLowerCase() === normalizedEmail,
    );

    if (matchedUser) {
      return matchedUser;
    }

    const nextPage = 'nextPage' in result.data ? result.data.nextPage : null;

    if (!nextPage || nextPage === page || users.length === 0) {
      break;
    }

    page = nextPage;
  }

  return null;
};

export const updateUserRoleMetadata = async (
  client: SupabaseClient,
  userId: string,
  role: string
) => {
  const { error } = await client.auth.admin.updateUserById(userId, {
    user_metadata: {
      role,
    },
  });

  if (error) {
    throw error;
  }
};
