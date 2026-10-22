import { SearchX } from "lucide-react";
import type { FC } from "react";

import { Button } from "../ui";

interface EmptyStateProps {
  search: string;
  pageOutOfRange: boolean;
  onReset: () => void;
}

export const EmptyState: FC<EmptyStateProps> = ({
  search,
  pageOutOfRange,
  onReset,
}) => {
  const message = pageOutOfRange
    ? "This page does not exist."
    : search
      ? `No webhooks match “${search}”.`
      : "No webhooks yet.";

  return (
    <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-3 text-sm text-fg-muted">
      <SearchX size={28} className="opacity-60" />
      {message}
      {pageOutOfRange && (
        <Button variant="secondary" onClick={onReset}>
          Go to first page
        </Button>
      )}
    </div>
  );
};
