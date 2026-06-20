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

/**
 * Upload files through Medusa's official File module (`POST /admin/uploads` →
 * the configured file provider, i.e. S3/Cloudflare R2 in prod, local in dev).
 * Returns the stored files with their public URLs. Multipart — no JSON
 * Content-Type so the browser sets the boundary.
 */
export async function adminUpload(
  files: File[]
): Promise<{ files: { id: string; url: string }[] }> {
  const form = new FormData()
  for (const file of files) form.append("files", file)
  const res = await fetch("/admin/uploads", {
    method: "POST",
    credentials: "include",
    body: form,
  })
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}
