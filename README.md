# Webhooks

Sign-in, a paginated/searchable webhook list and an edit form, running against an MSW mock of the provided API contract.

## Run

Requires Node 22 (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: session/rotate tests
npm run typecheck
npm run lint
npm run format       # Prettier (format:check in CI)
npm run build && npm run preview   # the mock also runs in the production build
```

**Test credentials:** `demo@example.com` / `demo-webhooks-2026`

The mock keeps everything in memory, so a page reload ends the session and asks you to sign in again (allowed by the task). The URL is preserved: after signing in you land back on the same `?page=&search=`.

## Stack

React 19 + TypeScript (strict, `noUncheckedIndexedAccess`), Vite, React Router, TanStack Query (server state), zustand (auth state), react-hook-form + zod, MSW, Vitest.

UI: Tailwind (animations are plain CSS keyframes), lucide-react (icons), react-toastify (notifications). Dark theme only: components use semantic color tokens (`bg-surface`, `text-fg`, …) defined once in `@theme` in `src/index.css`. Animations respect `prefers-reduced-motion`. The webhook table keeps a fixed size in every state (fixed column widths, a body always one page tall), so loading, paging, a short last page or an empty result never shift the layout.

## Structure

```
src/
  api/          HTTP client (CSRF, 419 retry, 401 → rotate), ApiError, fingerprint, contract types,
                endpoint factories (auth.ts, webhooks.ts)
  stores/       authStore (zustand) — session state machine (checking | anonymous | authenticated)
  hooks/        useWebhooks (TanStack Query), useListParams (page/search in the URL)
  pages/        LoginPage, WebhooksPage, EditWebhookPage (nested route rendered as a dialog)
  components/   ui/ (one file per primitive), layout, route guard; components/webhooks/ — table, pagination, form…
  lib/          422 payload → form field errors
  mocks/        in-memory db + handlers implementing the contract
  app/          composition root (client, APIs, QueryClient) and routes
  test/         client tests
```

Pages compose hooks and components; hooks talk to the API layer; nothing below `pages/` knows about routing except the route guard and the URL-params hook.

API modules are factories over a client instance (`createAuthApi(client)`), so the test builds its own client with a fixed fingerprint and the app wires singletons in `app/services.ts`.

## Key decisions

### HTTP client — `src/api/client.ts`

A thin wrapper over native `fetch`: the whole request flow reads top-down in one `request()` function. API modules only see `request<T>()`.

- Every request sends `X-Requested-With: XMLHttpRequest` and `credentials: 'include'`.
- **CSRF:** the first request of any kind awaits `GET /csrf`. Concurrent first requests share one in-flight promise. The token is sent as `X-CSRF-TOKEN` on POST/PUT.
- **419:** the client drops the token, fetches a new one and retries the request once. The token is dropped only if it is still the one that failed, so parallel 419s don't fetch `/csrf` several times.
- **401 → single rotate:**
  - The first 401 creates `rotatePromise`, and every other 401 awaits the same promise. It is cleared in `finally`.
  - **Session epoch:** a counter that goes up on each successful rotate. A request remembers the epoch it was sent in. If its 401 arrives after a rotate has already finished, the request is simply retried without rotating again. This covers slow requests that started before the rotate and finished after it.
  - Rotate and all `/auth/*` calls pass `refreshOn401: false`, so a rotate can never trigger another rotate.
  - Each request is retried at most once after a rotate.
- **Session lost:** if rotate fails, or the retried request gets 401 again, the client fires `onSessionLost`. The auth store subscribes to it at module level (no provider or effect needed), clears the query cache and switches to the anonymous state, and `RequireAuth` redirects to `/login` with the current location in `state.from`.

### Session

- `device_session_token` exists only as a local variable between `/auth/login` and `/auth/token/issue`. It is never stored anywhere.
- `fingerprint` is 32 random hex chars, generated once and kept in `localStorage`.
- Session tokens are never visible to the client. The mock keeps the session in memory, playing the role of an HttpOnly cookie.
- On startup `main.tsx` calls `restoreSession()` once (not from an effect, so StrictMode doesn't run it twice), which calls `GET /v1/me`. With a real cookie this would restore the session. With the mock it ends in 401 → rotate 400 → login screen.
- **Logout:** `revoke` (errors are ignored, since the local session is cleared either way), then `queryClient.clear()`, then the anonymous state.

### List

- The URL is the single source of truth for `page` and `search`, so reload and back/forward work without extra state.
- Search starts from 2 characters (a single character means "no filter" and shows a hint; the typed text stays in the field). It is debounced (300 ms) and pushes a history entry. Changing the search removes `page`, so the list goes back to page 1. The input syncs back from the URL on back/forward.
- `placeholderData: keepPreviousData` keeps the current page visible (dimmed) while the next one loads.
- The list has loading, error (with retry), empty and "page out of range" states.

### Editing

- The nested route `/webhooks/:id` renders a native `<dialog>` over the list. The list's query string is carried along, so closing the dialog returns to the same page and search.
- zod validates on the client for fast feedback. The server remains the source of truth.
- **422 errors:** the payload is mapped to fields via `setError`. Unknown keys fall back to a form-level error. 404 shows "not found".
- **On success:** the detail cache is updated with `setQueryData` and the list queries are invalidated.

## Mock notes

The mock follows the contract and its rules (30 s session, rotate extends it, 400 before issue and after revoke, fixed CSRF token checked on POST/PUT, captcha header required on login). It also has three additions:

- **Extra validation rule:** a webhook URL pointing to `localhost` or a private network returns 422 ("must point to a public host"). Webhooks are a classic SSRF vector, and this rule makes server-side field errors reachable from the UI, because client validation already rejects non-http(s) URLs. Try `http://localhost:8080/hook` in the edit form.
- **Wrong credentials:** 422 with a field error on `password` (as the contract asks) and a generic "Invalid credentials." that doesn't reveal whether the email exists. The login page shows it as a form-level message below the button rather than blaming one field.
- **Device tokens:** they are single-use and bound to the fingerprint they were issued for.
- **Service worker restarts:** a restarted MSW worker forgets which pages it mocks for and lets their requests through to the real server (login fails with 404 until a reload). Two causes are handled in `src/mocks/browser.ts`: (1) the MSW 3 worker waits for the page to acknowledge its keepalive/status messages, the client never does, and Chrome kills a worker whose event stays unsettled for 5 minutes — the page now acknowledges them; (2) Chrome stops idle workers in hidden tabs, where the keepalive timer is throttled — the page re-registers when it becomes visible after a long absence.
- **Response delays:** MSW's `delay()` gives realistic latency in the browser (so loading states are visible) and is near-instant in Node.

## Tests

`src/test/client.test.ts` runs the real client against the same MSW handlers via `msw/node`:

1. **Required scenario:** after sign-in the session is expired, then `me()` and `list()` run in parallel. The test checks that both got 401, `/auth/token/rotate` was called exactly once, both requests were retried successfully, and the session was not reported as lost.
2. Rotate fails (session revoked): both requests reject, rotate is called once, and `onSessionLost` fires once.
3. The retried request gets 401 again: rotate is called once and `onSessionLost` fires.
4. A 419 on PUT refetches the CSRF token and the request succeeds on retry.

Each test was checked to fail when the corresponding logic is removed from the client.

## Out of scope / possible improvements

- Libraries are split into a separate long-cached `vendor` chunk (~500 kB minified); route-level code splitting would shrink the first load further.
- Responses are typed but not validated at runtime. A zod schema per endpoint would catch contract drift.
- The only automated tests are client-level. Component tests (search debounce, 422 mapping) would be next.
- There is no captcha widget: a constant token is sent, which the mock accepts.
