import { QueryClient } from "@tanstack/react-query";

import { createAuthApi } from "../api/auth";
import { createApiClient } from "../api/client";
import { isApiError } from "../api/errors";
import { getFingerprint } from "../api/fingerprint";
import { createWebhooksApi } from "../api/webhooks";

export const apiClient = createApiClient({ getFingerprint });
export const authApi = createAuthApi(apiClient);
export const webhooksApi = createWebhooksApi(apiClient);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx are final (401 is already handled by the client); only network/5xx errors are worth retrying.
      retry: (failureCount, error) =>
        !(isApiError(error) && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});
