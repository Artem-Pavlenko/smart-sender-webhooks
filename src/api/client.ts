import { ApiError, NetworkError } from "./errors";

type Method = "GET" | "POST" | "PUT";

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Rotate the session and retry once on 401. Disabled for /auth/* so rotate can never trigger rotate. */
  refreshOn401?: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
  getFingerprint: () => string;
}

export interface ApiClient {
  /** Resolves with the parsed JSON body (`undefined` for empty responses), rejects with `ApiError` on non-2xx. */
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  getFingerprint(): string;
  /** Fired when the session can't be restored: rotate failed or the retried request got 401 again. */
  onSessionLost(listener: () => void): () => void;
}

const BASE_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json",
};

/**
 * Every request goes through: ensure CSRF token → send → on 419 refresh the token and resend once
 * → on 401 share a single rotate with all other 401s and resend once → parse or throw `ApiError`.
 */
export function createApiClient({
  baseUrl = "",
  getFingerprint,
}: ApiClientOptions): ApiClient {
  let csrfToken: string | null = null;
  let csrfPromise: Promise<string> | null = null;
  let rotatePromise: Promise<boolean> | null = null;
  // Bumped on every successful rotate. A request remembers the epoch it was sent in, so a 401
  // that arrives after a rotate has already finished is simply retried instead of rotating again.
  let sessionEpoch = 0;
  const sessionLostListeners = new Set<() => void>();

  function ensureCsrf(): Promise<string> {
    if (csrfToken) return Promise.resolve(csrfToken);
    csrfPromise ??= fetchCsrf().finally(() => {
      csrfPromise = null;
    });
    return csrfPromise;
  }

  async function fetchCsrf(): Promise<string> {
    const response = await sendRaw(`${baseUrl}/csrf`, {
      headers: BASE_HEADERS,
      credentials: "include",
    });
    const token = response.headers.get("X-CSRF-TOKEN");
    if (!response.ok || !token) throw await errorFrom(response);
    csrfToken = token;
    return token;
  }

  async function send(
    path: string,
    options: RequestOptions,
  ): Promise<Response> {
    const { method = "GET", body, signal } = options;
    const token = await ensureCsrf();

    const headers = new Headers(options.headers);
    Object.entries(BASE_HEADERS).forEach(([name, value]) =>
      headers.set(name, value),
    );
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (method !== "GET") headers.set("X-CSRF-TOKEN", token);

    const response = await sendRaw(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      signal,
    });

    // Drop the token only if nobody has refreshed it yet, so parallel 419s fetch /csrf once.
    if (response.status === 419 && csrfToken === token) csrfToken = null;
    return response;
  }

  async function sendWithCsrfRetry(
    path: string,
    options: RequestOptions,
  ): Promise<Response> {
    const response = await send(path, options);
    return response.status === 419 ? send(path, options) : response;
  }

  function emitSessionLost() {
    sessionLostListeners.forEach((listener) => listener());
  }

  async function rotate(): Promise<boolean> {
    try {
      await request("/auth/token/rotate", {
        method: "POST",
        body: { fingerprint: getFingerprint() },
        refreshOn401: false,
      });
      sessionEpoch += 1;
      return true;
    } catch {
      emitSessionLost();
      return false;
    }
  }

  function refreshSession(sentInEpoch: number): Promise<boolean> {
    if (sentInEpoch !== sessionEpoch) return Promise.resolve(true);
    rotatePromise ??= rotate().finally(() => {
      rotatePromise = null;
    });
    return rotatePromise;
  }

  async function parse<T>(response: Response): Promise<T> {
    if (!response.ok) throw await errorFrom(response);
    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // e.g. an HTML page from a proxy or dev server instead of the API.
      throw ApiError.fromBody(response.status, null);
    }
  }

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { refreshOn401 = true } = options;
    const epoch = sessionEpoch;

    let response = await sendWithCsrfRetry(path, options);
    if (response.status === 401 && refreshOn401) {
      const refreshed = await refreshSession(epoch);
      if (!refreshed) throw await errorFrom(response);

      response = await sendWithCsrfRetry(path, options);
      if (response.status === 401) emitSessionLost();
    }

    return parse<T>(response);
  }

  return {
    request,
    getFingerprint,
    onSessionLost(listener) {
      sessionLostListeners.add(listener);
      return () => sessionLostListeners.delete(listener);
    },
  };
}

/** fetch() rejects only when there is no response; cancellations pass through untouched. */
async function sendRaw(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new NetworkError();
  }
}

async function errorFrom(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  return ApiError.fromBody(response.status, body);
}
