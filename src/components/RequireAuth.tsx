import type { FC } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { useAuthStore } from "../stores/authStore";

export const RequireAuth: FC = () => {
  const status = useAuthStore((store) => store.state.status);
  const location = useLocation();

  if (status !== "authenticated") {
    // Keep the full location so ?page&search survive the trip through the login screen.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};
