import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { useAuthStore } from "./stores/authStore";

import "./index.css";

// There is no real backend, so the mock runs in production builds too.
async function enableMocking() {
  const { startMocking } = await import("./mocks/browser");
  await startMocking();
}

void enableMocking().then(() => {
  // Started here rather than in an effect, so StrictMode doesn't run it twice.
  void useAuthStore.getState().restoreSession();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
