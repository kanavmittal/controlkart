import { MEDUSA_BACKEND_URL, PUBLISHABLE_KEY } from "./config"

type FetchOptions = {
  method?: string
  body?: unknown
  query?: Record<string, string | number | undefined>
  headers?: Record<string, string>
  /** Next.js cache revalidation in seconds. Defaults to 60 for GETs. */
  revalidate?: number | false
  /** Bypass Next.js fetch cache entirely (use for authenticated requests). */
  cache?: RequestCache
  tags?: string[]
}

/** Thin server-side client for the Medusa Store API. */
export async function storeFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = new URL(`${MEDUSA_BACKEND_URL}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  const method = options.method ?? "GET"
  const useNoStore = options.cache === "no-store" || method !== "GET"

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    ...(useNoStore
      ? { cache: "no-store" as const }
      : {
          next: {
            revalidate: options.revalidate ?? 60,
            tags: options.tags,
          },
        }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Medusa request failed (${res.status}): ${text}`)
  }
  return res.json()
}
