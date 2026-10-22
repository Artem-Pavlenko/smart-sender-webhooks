import { Loader2 } from "lucide-react";
import type { FC } from "react";

interface SpinnerProps {
  label?: string;
}

export const Spinner: FC<SpinnerProps> = ({ label = "Loading…" }) => (
  <div
    role="status"
    className="flex animate-fade-in-up items-center gap-2 text-sm text-fg-muted"
  >
    <Loader2 size={16} className="animate-spin" />
    {label}
  </div>
);
