import { delay, http, HttpResponse } from "msw";

import type { FieldErrors } from "../api/types";
import { CSRF_TOKEN, db, SESSION_TTL_MS, TEST_CREDENTIALS, USER } from "./db";
import { errorResponse, validationError } from "./responses";

// `*/path` matches any origin: relative URLs in the browser and http://localhost in tests.

type Body = Record<string, unknown>;

async function readBody(request: Request): Promise<Body> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null ? (body as Body) : {};
}

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const hasValidCsrf = (request: Request) =>
  request.headers.get("X-CSRF-TOKEN") === CSRF_TOKEN;

const isAuthenticated = () =>
  db.session !== null && db.session.expiresAt > Date.now();

function startSession(fingerprint: string) {
  db.session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS };
}

function createDeviceToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

const PRIVATE_HOST_RE =
  /^(localhost|.*\.localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/;

function validateWebhookInput(body: Body): FieldErrors {
  const errors: FieldErrors = {};
  const name = asString(body.name).trim();
  const url = asString(body.url).trim();

  if (!name) errors.name = ["The name field is required."];
  else if (name.length > 255)
    errors.name = ["The name may not be greater than 255 characters."];

  const parsed = URL.canParse(url) ? new URL(url) : null;
  if (!url) errors.url = ["The url field is required."];
  else if (!parsed || !["http:", "https:"].includes(parsed.protocol))
    errors.url = ["The url must be a valid URL."];
  // Extra rule beyond the contract (see README): webhooks must not target internal hosts (SSRF).
  else if (PRIVATE_HOST_RE.test(parsed.hostname))
    errors.url = ["The url must point to a public host."];

  return errors;
}

export const handlers = [
  http.get(
    "*/csrf",
    () =>
      new HttpResponse(null, {
        status: 204,
        headers: { "X-CSRF-TOKEN": CSRF_TOKEN },
      }),
  ),

  http.post("*/auth/login", async ({ request }) => {
    await delay();
    if (!hasValidCsrf(request)) return errorResponse(419);
    if (!request.headers.get("X-Captcha-Token")) return errorResponse(400);

    const body = await readBody(request);
    const email = asString(body.email).trim();
    const password = asString(body.password);
    const fingerprint = asString(body.fingerprint);

    const errors: FieldErrors = {};
    if (!email) errors.email = ["The email field is required."];
    if (!password) errors.password = ["The password field is required."];
    if (!/^[0-9a-f]{32}$/.test(fingerprint))
      errors.fingerprint = ["The fingerprint is invalid."];
    if (Object.keys(errors).length) return validationError(errors);

    // A field error, as the contract asks; the generic text doesn't reveal whether the email exists.
    if (
      email.toLowerCase() !== TEST_CREDENTIALS.email ||
      password !== TEST_CREDENTIALS.password
    ) {
      return validationError({ password: ["Invalid credentials."] });
    }

    const token = createDeviceToken();
    db.deviceTokens.set(token, fingerprint);
    return HttpResponse.json({ device_session_token: token });
  }),

  http.post("*/auth/token/issue", async ({ request }) => {
    await delay();
    if (!hasValidCsrf(request)) return errorResponse(419);

    const body = await readBody(request);
    const token = asString(body.device_session_token);
    const fingerprint = asString(body.fingerprint);

    if (!token || db.deviceTokens.get(token) !== fingerprint) {
      return validationError({
        device_session_token: ["The device session token is invalid."],
      });
    }
    db.deviceTokens.delete(token);
    startSession(fingerprint);
    return new HttpResponse(null, { status: 200 });
  }),

  http.post("*/auth/token/rotate", async ({ request }) => {
    await delay();
    if (!hasValidCsrf(request)) return errorResponse(419);

    const { fingerprint } = await readBody(request);
    // An expired session can still be rotated — that's the point. Before issue / after revoke it can't.
    if (!db.session || db.session.fingerprint !== fingerprint)
      return errorResponse(400);
    startSession(db.session.fingerprint);
    return new HttpResponse(null, { status: 200 });
  }),

  http.post("*/auth/token/revoke", async ({ request }) => {
    await delay();
    if (!hasValidCsrf(request)) return errorResponse(419);
    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("*/v1/me", async () => {
    await delay();
    if (!isAuthenticated()) return errorResponse(401);
    return HttpResponse.json(USER);
  }),

  http.get("*/v1/webhooks", async ({ request }) => {
    await delay();
    if (!isAuthenticated()) return errorResponse(401);

    const params = new URL(request.url).searchParams;
    const page = Math.max(
      1,
      Number.parseInt(params.get("page") ?? "", 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(params.get("limit") ?? "", 10) || 10),
    );
    const search = (params.get("search") ?? "").trim().toLowerCase();

    const matched = search
      ? db.webhooks.filter((w) => w.name.toLowerCase().includes(search))
      : db.webhooks;
    const start = (page - 1) * limit;

    return HttpResponse.json({
      data: matched.slice(start, start + limit),
      paging: {
        pages: {
          current: page,
          last: Math.max(1, Math.ceil(matched.length / limit)),
        },
        results: { total: matched.length, limitation: limit },
      },
    });
  }),

  http.get("*/v1/webhooks/:id", async ({ params }) => {
    await delay();
    if (!isAuthenticated()) return errorResponse(401);

    const webhook = db.webhooks.find((w) => w.id === Number(params.id));
    return webhook ? HttpResponse.json(webhook) : errorResponse(404);
  }),

  http.put("*/v1/webhooks/:id", async ({ request, params }) => {
    await delay();
    if (!hasValidCsrf(request)) return errorResponse(419);
    if (!isAuthenticated()) return errorResponse(401);

    const index = db.webhooks.findIndex((w) => w.id === Number(params.id));
    const current = db.webhooks[index];
    if (!current) return errorResponse(404);

    const body = await readBody(request);
    const errors = validateWebhookInput(body);
    if (Object.keys(errors).length) return validationError(errors);

    const updated = {
      ...current,
      name: asString(body.name).trim(),
      url: asString(body.url).trim(),
    };
    db.webhooks[index] = updated;
    return HttpResponse.json(updated);
  }),
];
