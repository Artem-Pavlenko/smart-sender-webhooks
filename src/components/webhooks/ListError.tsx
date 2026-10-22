import { AlertTriangle, RotateCw } from "lucide-react";
import type { FC } from "react";

import { getErrorMessage } from "../../api/errors";
import { Button } from "../ui";

interface ListErrorProps {
  error: unknown;
  onRetry: () => void;
}

export const ListError: FC<ListErrorProps> = ({ error, onRetry }) => (
  <div
    role="alert"
    className="flex h-full animate-fade-in flex-col items-center justify-center gap-3 text-sm text-danger"
  >
    <AlertTriangle size={28} className="opacity-80" />
    <p>Failed to load webhooks: {getErrorMessage(error)}</p>
    <Button variant="secondary" onClick={onRetry}>
      <RotateCw size={14} />
      Retry
    </Button>
  </div>
);
