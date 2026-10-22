import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FC } from "react";

import { Button } from "../ui";

interface PaginationProps {
  page: number;
  last: number;
  onChange: (page: number) => void;
  /** Keeps the space while there is nothing to paginate, so the layout doesn't jump. */
  hidden?: boolean;
}

export const Pagination: FC<PaginationProps> = ({
  page,
  last,
  onChange,
  hidden = false,
}) => (
  <nav
    aria-label="Pagination"
    aria-hidden={hidden}
    className={`flex items-center justify-end gap-3 text-sm text-fg-muted ${hidden ? "invisible" : ""}`}
  >
    <Button
      variant="secondary"
      disabled={page <= 1}
      onClick={() => onChange(page - 1)}
    >
      <ChevronLeft size={16} />
      Previous
    </Button>
    <span className="min-w-24 text-center tabular-nums">
      Page {page} of {last}
    </span>
    <Button
      variant="secondary"
      disabled={page >= last}
      onClick={() => onChange(page + 1)}
    >
      Next
      <ChevronRight size={16} />
    </Button>
  </nav>
);
