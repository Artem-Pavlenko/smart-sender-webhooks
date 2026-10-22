import { toast } from "react-toastify";
import { create } from "zustand";

import type { Credentials } from "../api/auth";
import type { User } from "../api/types";
import { apiClient, authApi, queryClient } from "../app/services";

/** `checking` covers the startup `/v1/me` call, so routes don't redirect to /login before it resolves. */
export type AuthState =
  | { status: "checking" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };

interface AuthStore {
  state: AuthState;
  restoreSession: () => Promise<void>;
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
}

const anonymous: AuthState = { status: "anonymous" };

export const useAuthStore = create<AuthStore>()((set) => ({
  state: { status: "checking" },

  // With a real HttpOnly cookie this restores the session after reload. The in-memory mock
  // starts empty, so it ends with 401 → rotate 400 → login screen, which the task allows.
  async restoreSession() {
    try {
      const user = await authApi.me();
      set({ state: { status: "authenticated", user } });
    } catch {
      set({ state: anonymous });
    }
  },

  async signIn(credentials) {
    // The device token lives only in this function — never stored anywhere.
    const { device_session_token } = await authApi.login(credentials);
    await authApi.issue(device_session_token);
    const user = await authApi.me();
    set({ state: { status: "authenticated", user } });
  },

  async signOut() {
    try {
      await authApi.revoke();
    } catch {
      // The local session is cleared regardless of the server response.
    }
    // Toasts may mention the user's data (e.g. a saved webhook name).
    toast.dismiss();
    queryClient.clear();
    set({ state: anonymous });
  },
}));

// The client reports a lost session outside React, so the store handles it directly.
const unsubscribe = apiClient.onSessionLost(() => {
  // During the startup check there was no session to lose — no toast then.
  if (useAuthStore.getState().state.status === "authenticated") {
    toast.info("Your session has expired. Please sign in again.");
  }
  queryClient.clear();
  useAuthStore.setState({ state: anonymous });
});
import.meta.hot?.dispose(unsubscribe);
