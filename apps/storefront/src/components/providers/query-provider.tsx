"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

/**
 * Root TanStack Query provider. The QueryClient is created in state (one per
 * client, not module scope) — the canonical Next.js App Router pattern that
 * avoids sharing a client across requests/users during SSR.
 *
 * Global staleTime is 60s for normal data; price/stock/cart queries override it
 * to 0 via DYNAMIC_QUERY_OPTIONS (see lib/query-keys.ts).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
