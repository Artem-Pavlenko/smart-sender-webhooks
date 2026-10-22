import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { WebhookList } from "../api/types";
import type { WebhookInput, WebhookListParams } from "../api/webhooks";
import { webhooksApi } from "../app/services";

// Hierarchical keys: invalidating `lists()` refreshes every cached page/search combination at once.
export const webhookKeys = {
  all: ["webhooks"] as const,
  lists: () => [...webhookKeys.all, "list"] as const,
  list: (params: WebhookListParams) =>
    [...webhookKeys.lists(), params] as const,
  detail: (id: number) => [...webhookKeys.all, "detail", id] as const,
};

export function useWebhooks(params: WebhookListParams) {
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: ({ signal }) => webhooksApi.list(params, signal),
    // Keep the current page on screen while the next one loads instead of flashing a spinner.
    placeholderData: keepPreviousData,
  });
}

export function useWebhook(id: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => webhooksApi.get(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    // Opened from the list, the row is already cached: show it at once and refetch in the background.
    initialData: () =>
      queryClient
        .getQueriesData<WebhookList>({ queryKey: webhookKeys.lists() })
        .flatMap(([, list]) => list?.data ?? [])
        .find((webhook) => webhook.id === id),
  });
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WebhookInput) => webhooksApi.update(id, input),
    onSuccess: async (webhook) => {
      // The response is the fresh entity, so the detail needs no refetch; lists may change order/filter matches.
      queryClient.setQueryData(webhookKeys.detail(id), webhook);
      await queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}
