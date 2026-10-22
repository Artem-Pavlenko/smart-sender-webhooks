import { Pencil } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Link, useLocation } from "react-router";

import type { Webhook } from "../../api/types";
import { PAGE_SIZE } from "../../api/webhooks";
import { Skeleton } from "../ui";

// The table keeps one size in every state: fixed column widths (`table-fixed` + colgroup) and a
// body that is always PAGE_SIZE rows tall, so loading, paging, a short last page or an empty
// result never move the layout.
const ROW = "h-13";

interface WebhookTableProps {
  /** `undefined` while the first page is loading. */
  webhooks: Webhook[] | undefined;
  /** The previous page is shown while the next one loads. */
  dimmed?: boolean;
  /** Replaces the rows (empty result, error), rendered under the header at full body height. */
  fallback?: ReactNode;
}

export const WebhookTable: FC<WebhookTableProps> = ({
  webhooks,
  dimmed = false,
  fallback,
}) => (
  <div
    data-table-card
    className={`overflow-x-auto rounded-xl border border-line bg-surface shadow-sm transition-opacity duration-200 ${dimmed ? "opacity-50" : ""}`}
  >
    <table className="w-full min-w-[640px] table-fixed text-left text-sm">
      <colgroup>
        <col className="w-[28%]" />
        <col />
        <col className="w-32" />
        <col className="w-24" />
      </colgroup>
      <thead className="border-b border-line bg-surface-muted text-xs tracking-wide text-fg-muted uppercase">
        <tr className="h-10">
          <th className="px-4 font-medium">Name</th>
          <th className="px-4 font-medium">URL</th>
          <th className="px-4 font-medium">Status</th>
          <th className="px-4" />
        </tr>
      </thead>
      <tbody>
        {fallback ? (
          <tr>
            <td
              colSpan={4}
              style={{ height: `calc(${PAGE_SIZE} * var(--spacing) * 13)` }}
            >
              {fallback}
            </td>
          </tr>
        ) : webhooks ? (
          <>
            {webhooks.map((webhook, index) => (
              <WebhookRow key={webhook.id} webhook={webhook} index={index} />
            ))}
            {/* Fillers keep a short last page as tall as a full one. */}
            {Array.from({ length: PAGE_SIZE - webhooks.length }, (_, index) => (
              <tr key={`filler-${index}`} aria-hidden className={ROW} />
            ))}
          </>
        ) : (
          <SkeletonRows />
        )}
      </tbody>
    </table>
  </div>
);

interface WebhookRowProps {
  webhook: Webhook;
  index: number;
}

const WebhookRow: FC<WebhookRowProps> = ({ webhook, index }) => {
  const location = useLocation();

  return (
    <tr
      // Opacity only: a translate would push the last row out of the scroll box and flash a scrollbar.
      style={{ animationDelay: `${index * 25}ms` }}
      className={`${ROW} animate-fade-in border-b border-line transition-colors last:border-0 hover:bg-surface-muted`}
    >
      <td className="truncate px-4 font-medium" title={webhook.name}>
        {webhook.name}
      </td>
      <td
        className="truncate px-4 font-mono text-xs text-fg-muted"
        title={webhook.url}
      >
        {webhook.url}
      </td>
      <td className="px-4">
        <StatusBadge active={webhook.active} />
      </td>
      <td className="px-4 text-right">
        {/* Carry the list params so closing the dialog lands on the same page. */}
        <Link
          to={{ pathname: String(webhook.id), search: location.search }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-fg-muted transition-colors hover:bg-surface hover:text-accent"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </td>
    </tr>
  );
};

const SkeletonRows: FC = () => {
  return Array.from({ length: PAGE_SIZE }, (_, index) => (
    <tr key={index} className={`${ROW} border-b border-line last:border-0`}>
      <td className="px-4">
        {index === 0 && (
          <span
            role="status"
            aria-label="Loading webhooks"
            className="sr-only"
          />
        )}
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="px-4">
        <Skeleton className="h-4 w-56" />
      </td>
      <td className="px-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="px-4">
        <Skeleton className="ml-auto h-4 w-10" />
      </td>
    </tr>
  ));
};

interface StatusBadgeProps {
  active: boolean;
}

const StatusBadge: FC<StatusBadgeProps> = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? "bg-success-soft text-success" : "bg-surface-muted text-fg-muted"
    }`}
  >
    <span className="relative flex size-1.5">
      {active && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
      )}
      <span className="relative inline-flex size-1.5 rounded-full bg-current" />
    </span>
    {active ? "Active" : "Inactive"}
  </span>
);
