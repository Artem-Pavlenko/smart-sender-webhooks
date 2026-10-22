import { http } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createAuthApi } from "../api/auth";
import { createApiClient } from "../api/client";
import { createWebhooksApi } from "../api/webhooks";
import { expireSession, resetDb, TEST_CREDENTIALS, USER } from "../mocks/db";
import { server } from "../mocks/node";
import { errorResponse } from "../mocks/responses";

const FINGERPRINT = "0123456789abcdef0123456789abcdef";

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  server.events.removeAllListeners();
  resetDb();
});
afterAll(() => server.close());

async function setupSignedIn() {
  // Node has no localStorage, so the fingerprint is injected.
  const client = createApiClient({
    baseUrl: "http://localhost",
    getFingerprint: () => FINGERPRINT,
  });
  const auth = createAuthApi(client);
  const webhooks = createWebhooksApi(client);

  const { device_session_token } = await auth.login(TEST_CREDENTIALS);
  await auth.issue(device_session_token);

  const onSessionLost = vi.fn();
  client.onSessionLost(onSessionLost);
  return { auth, webhooks, onSessionLost };
}

function recordTraffic() {
  const requests: string[] = [];
  const responses: { request: string; status: number }[] = [];
  const label = (request: Request) =>
    `${request.method} ${new URL(request.url).pathname}`;

  server.events.on("request:start", ({ request }) =>
    requests.push(label(request)),
  );
  server.events.on("response:mocked", ({ request, response }) =>
    responses.push({ request: label(request), status: response.status }),
  );

  return {
    count: (request: string) => requests.filter((r) => r === request).length,
    statuses: (status: number) =>
      responses.filter((r) => r.status === status).map((r) => r.request),
  };
}

describe("api client session handling", () => {
  it("shares one rotate between parallel 401s and retries both requests", async () => {
    const { auth, webhooks, onSessionLost } = await setupSignedIn();
    expireSession();
    const traffic = recordTraffic();

    const [me, list] = await Promise.all([
      auth.me(),
      webhooks.list({ page: 1, search: "" }),
    ]);

    expect(me).toEqual(USER);
    expect(list.data).toHaveLength(10);
    expect(traffic.statuses(401).sort()).toEqual([
      "GET /v1/me",
      "GET /v1/webhooks",
    ]);
    expect(traffic.count("POST /auth/token/rotate")).toBe(1);
    expect(traffic.count("GET /v1/me")).toBe(2);
    expect(traffic.count("GET /v1/webhooks")).toBe(2);
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it("reports a lost session when rotate fails", async () => {
    const { auth, webhooks, onSessionLost } = await setupSignedIn();
    await auth.revoke();
    const traffic = recordTraffic();

    const results = await Promise.allSettled([
      auth.me(),
      webhooks.list({ page: 1, search: "" }),
    ]);

    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(traffic.count("POST /auth/token/rotate")).toBe(1);
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it("reports a lost session when the retried request gets 401 again", async () => {
    const { auth, onSessionLost } = await setupSignedIn();
    expireSession();
    server.use(http.get("*/v1/me", () => errorResponse(401)));
    const traffic = recordTraffic();

    await expect(auth.me()).rejects.toMatchObject({ status: 401 });

    expect(traffic.count("POST /auth/token/rotate")).toBe(1);
    expect(traffic.count("GET /v1/me")).toBe(2);
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it("refetches the CSRF token and retries once on 419", async () => {
    const { webhooks } = await setupSignedIn();
    server.use(
      http.put("*/v1/webhooks/:id", () => errorResponse(419), { once: true }),
    );
    const traffic = recordTraffic();

    const updated = await webhooks.update(1, {
      name: "Renamed",
      url: "https://example.com/hook",
    });

    expect(updated.name).toBe("Renamed");
    expect(traffic.count("GET /csrf")).toBe(1);
    expect(traffic.count("PUT /v1/webhooks/1")).toBe(2);
  });
});
