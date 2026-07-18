/**
 * Sanitizes a user-supplied post-auth redirect target. Only same-origin paths
 * are allowed (`/checkout`, `/account`); absolute URLs and protocol-relative
 * URLs (`//evil.com`) fall back — this blocks open-redirect abuse of
 * `?redirect=` links.
 */
export function safeRedirect(
  target: string | null | undefined,
  fallback = "/account"
): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) {
    return target
  }
  return fallback
}
