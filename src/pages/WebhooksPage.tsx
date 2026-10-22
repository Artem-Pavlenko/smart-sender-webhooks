import type { FC } from "react";
import { Outlet } from "react-router";

import { EmptyState } from "../components/webhooks/EmptyState";
import { ListError } from "../components/webhooks/ListError";
import { Pagination } from "../components/webhooks/Pagination";
import { SearchField } from "../components/webhooks/SearchField";
import { WebhookTable } from "../components/webhooks/WebhookTable";
import { useListParams } from "../hooks/useListParams";
import { useWebhooks } from "../hooks/useWebhooks";

export const WebhooksPage: FC = () => {
  const { page, search, setPage, setSearch } = useListParams();
  const query = useWebhooks({ page, search });
  const list = query.data;
  const isEmpty = list?.data.length === 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          {/* Always rendered so the line doesn't push the table down once data arrives. */}
          <p className="min-h-5 text-sm text-fg-muted">
            {list && `${list.paging.results.total} total`}
          </p>
        </div>
        <SearchField value={search} onChange={setSearch} />
      </div>

      <WebhookTable
        webhooks={list?.data}
        dimmed={query.isPlaceholderData}
        fallback={
          query.isError ? (
            <ListError
              error={query.error}
              onRetry={() => void query.refetch()}
            />
          ) : isEmpty ? (
            <EmptyState
              search={search}
              pageOutOfRange={page > list.paging.pages.last}
              onReset={() => setPage(1)}
            />
          ) : null
        }
      />
      <Pagination
        page={list?.paging.pages.current ?? page}
        last={list?.paging.pages.last ?? page}
        onChange={setPage}
        hidden={!list || isEmpty || query.isError}
      />

      <Outlet />
    </section>
  );
};
