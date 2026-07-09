import { BASE_URL } from "@/lib/config"

/**
 * Resolves a possibly-relative document URL (e.g. a `/uploads/...` path from
 * the backend's local file storage) to an absolute URL. Absolute `http(s)`
 * URLs pass through unchanged.
 *
 * Moved here (T28) from the old `products/downloads-list.tsx` so that file
 * can be deleted in T29 without breaking `quick-view-dialog.tsx`, which also
 * needs this helper for its datasheet download link.
 */
export function resolveDownloadUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  if (url.startsWith("/")) {
    return `${BASE_URL}${url}`
  }
  return url
}
