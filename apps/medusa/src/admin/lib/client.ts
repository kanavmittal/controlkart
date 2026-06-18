/** Minimal fetch helper for custom admin routes (same-origin, session auth). */
export async function adminFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}
