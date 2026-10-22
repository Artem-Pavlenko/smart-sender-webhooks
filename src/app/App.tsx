import { QueryClientProvider } from "@tanstack/react-query";
import type { FC } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ToastContainer } from "react-toastify";

import { AppLayout } from "../components/AppLayout";
import { RequireAuth } from "../components/RequireAuth";
import { Spinner } from "../components/ui";
import { EditWebhookPage } from "../pages/EditWebhookPage";
import { LoginPage } from "../pages/LoginPage";
import { WebhooksPage } from "../pages/WebhooksPage";
import { useAuthStore } from "../stores/authStore";
import { queryClient } from "./services";

const AppRoutes: FC = () => {
  const status = useAuthStore((store) => store.state.status);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking session…" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/webhooks" element={<WebhooksPage />}>
            <Route path=":id" element={<EditWebhookPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/webhooks" replace />} />
    </Routes>
  );
};

export const App: FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar
      newestOnTop
    />
  </QueryClientProvider>
);
