/**
 * ControlKart design tokens.
 * Minimalist, grid-driven, border-based. No gradients, no decorative type.
 */
export const tokens = {
  layout: {
    maxWidth: "1440px",
    gutter: "1.5rem",
    sectionGapY: "6rem",
  },
  color: {
    ink: "#16181d", // primary text - graphite
    inkMuted: "#5c626e", // secondary text - steel gray
    inkFaint: "#9aa0ab",
    surface: "#ffffff",
    surfaceAlt: "#f6f7f8", // off-white panels
    border: "#e2e4e8",
    borderStrong: "#16181d",
    accent: "#1d4ed8", // muted industrial blue
    success: "#15803d",
    warning: "#b45309",
    danger: "#b91c1c",
  },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
  },
} as const

export type Tokens = typeof tokens
