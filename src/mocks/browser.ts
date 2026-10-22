import { setupWorker, type StartOptions } from "msw/browser";

import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

const options: StartOptions = { onUnhandledFrame: "bypass" };

// A restarted MSW worker forgets which pages it mocks for and sends their requests to the real
// server (404 here). Two things below keep that from happening.

// 1. The MSW 3 worker waits for the page to acknowledge these messages, but its client never
// does, so every keepalive leaves an unsettled event and Chrome kills the worker after 5 minutes.
const UNACKNOWLEDGED_WORKER_MESSAGES = new Set([
  "KEEPALIVE_RESPONSE",
  "INTEGRITY_CHECK_RESPONSE",
  "MOCKING_ENABLED",
  "CLIENT_CLOSED",
]);

function acknowledgeWorkerMessages() {
  navigator.serviceWorker.addEventListener(
    "message",
    (event: MessageEvent<unknown>) => {
      const type = (event.data as { type?: unknown } | null)?.type;
      if (
        typeof type === "string" &&
        UNACKNOWLEDGED_WORKER_MESSAGES.has(type)
      ) {
        event.ports[0]?.postMessage(null);
      }
    },
  );
}

// 2. Chrome also stops idle workers after ~30 s, and in hidden tabs the keepalive timer is
// throttled, so after a long absence the page registers itself with the worker again.
const WORKER_IDLE_LIMIT_MS = 25_000;

function reactivateAfterLongAbsence() {
  const restart = async () => {
    await worker.stop();
    await worker.start(options);
  };

  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else if (Date.now() - hiddenAt > WORKER_IDLE_LIMIT_MS) {
      void restart();
    }
  });
}

export async function startMocking() {
  acknowledgeWorkerMessages();
  await worker.start(options);
  reactivateAfterLongAbsence();
}
