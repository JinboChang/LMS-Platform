import { createAuthRequestConfig } from "@/lib/remote/get-auth-header";

export const buildAuthorizationHeaders = async () => {
  const config = await createAuthRequestConfig();
  return config.headers ?? {};
};