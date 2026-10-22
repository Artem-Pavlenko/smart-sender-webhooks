import { LogOut } from "lucide-react";
import type { FC } from "react";
import { Outlet } from "react-router";

import logo from "../assets/logo.svg";
import { useAuthStore } from "../stores/authStore";
import { Button } from "./ui";

export const AppLayout: FC = () => {
  const state = useAuthStore((store) => store.state);
  const signOut = useAuthStore((store) => store.signOut);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-3">
            <img src={logo} alt="Smart Sender" className="h-10 w-auto" />
            <span className="h-6 w-px bg-line-strong" aria-hidden />
            <span className="font-semibold">Webhooks</span>
          </span>
          <div className="flex items-center gap-2 text-sm">
            {state.status === "authenticated" && (
              <span className="mr-1 text-fg-muted">{state.user.name}</span>
            )}
            <Button variant="secondary" onClick={signOut}>
              <LogOut size={14} />
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};
