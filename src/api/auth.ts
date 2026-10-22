import type { ApiClient } from "./client";
import type { User } from "./types";

export interface Credentials {
  email: string;
  password: string;
}

// A real app would get this from a captcha widget; the mock accepts any non-empty value.
const CAPTCHA_TOKEN = "mock-captcha-token";

export function createAuthApi(client: ApiClient) {
  const fingerprint = () => client.getFingerprint();

  return {
    login: (credentials: Credentials) =>
      client.request<{ device_session_token: string }>("/auth/login", {
        method: "POST",
        body: { ...credentials, fingerprint: fingerprint() },
        headers: { "X-Captcha-Token": CAPTCHA_TOKEN },
        refreshOn401: false,
      }),

    issue: (deviceSessionToken: string) =>
      client.request<void>("/auth/token/issue", {
        method: "POST",
        body: {
          device_session_token: deviceSessionToken,
          fingerprint: fingerprint(),
        },
        refreshOn401: false,
      }),

    revoke: () =>
      client.request<void>("/auth/token/revoke", {
        method: "POST",
        body: { fingerprint: fingerprint() },
        refreshOn401: false,
      }),

    me: (signal?: AbortSignal) => client.request<User>("/v1/me", { signal }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
