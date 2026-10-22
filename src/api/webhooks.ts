import type { ApiClient } from "./client";
import type { Webhook, WebhookList } from "./types";

export const PAGE_SIZE = 10;

export interface WebhookListParams {
  page: number;
  search: string;
}

export interface WebhookInput {
  name: string;
  url: string;
}

export function createWebhooksApi(client: ApiClient) {
  return {
    list: ({ page, search }: WebhookListParams, signal?: AbortSignal) => {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const term = search.trim();
      if (term) query.set("search", term);
      return client.request<WebhookList>(`/v1/webhooks?${query}`, { signal });
    },

    get: (id: number, signal?: AbortSignal) =>
      client.request<Webhook>(`/v1/webhooks/${id}`, { signal }),

    update: (id: number, input: WebhookInput) =>
      client.request<Webhook>(`/v1/webhooks/${id}`, {
        method: "PUT",
        body: input,
      }),
  };
}

export type WebhooksApi = ReturnType<typeof createWebhooksApi>;
