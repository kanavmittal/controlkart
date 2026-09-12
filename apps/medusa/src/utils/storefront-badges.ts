export type StorefrontBadge = { label: string; tone: "new" | "sale" | "custom" }
export type BadgeSettings = { badges: StorefrontBadge[]; show_sale_badge: boolean }

/** Validate before touching metadata. Text is rendered as text, never HTML. */
export function parseBadgeSettings(value: unknown): BadgeSettings {
  if (!value || typeof value !== "object") throw new Error("Invalid badge settings")
  const { badges, show_sale_badge } = value as BadgeSettings
  if (!Array.isArray(badges) || badges.length > 3) throw new Error("Add at most 3 badges")
  if (typeof show_sale_badge !== "boolean") throw new Error("Choose whether to show price discounts")
  const normalized = badges.map((badge) => {
    if (!badge || typeof badge.label !== "string" || !badge.label.trim() || badge.label.trim().length > 40) {
      throw new Error("Each badge needs 1–40 characters")
    }
    if (!["new", "sale", "custom"].includes(badge.tone)) throw new Error("Invalid badge color")
    return { label: badge.label.trim(), tone: badge.tone }
  })
  if (new Set(normalized.map((badge) => badge.label.toLowerCase())).size !== normalized.length) {
    throw new Error("Badge labels must be unique")
  }
  return { badges: normalized, show_sale_badge }
}

export function readBadgeSettings(metadata: Record<string, unknown> | null | undefined): BadgeSettings {
  return {
    badges: Array.isArray(metadata?.storefront_badges) ? metadata.storefront_badges as StorefrontBadge[] : [],
    show_sale_badge: metadata?.show_sale_badge !== false,
  }
}

export function mergeBadgeSettings(metadata: Record<string, unknown> | null | undefined, settings: BadgeSettings) {
  return { ...metadata, storefront_badges: settings.badges, show_sale_badge: settings.show_sale_badge }
}
