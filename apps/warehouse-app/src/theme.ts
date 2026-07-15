/**
 * Dark warehouse theme constants.
 *
 * Screens in this app run on handheld scanners in dim warehouse aisles, often
 * operated one-handed while the other hand holds stock. Everything here is
 * tuned for that: near-black backgrounds (battery + glare), high-contrast
 * text, and large touch targets (gloves, fast taps, no precision pointing).
 */

export const colors = {
  background: "#08090C",
  surface: "#15171C",
  surfaceRaised: "#1F2229",
  border: "#2A2D35",
  text: "#F5F6F8",
  textMuted: "#A7ACB8",
  accent: "#3DDC84",
  accentMuted: "#1F5C3D",
  danger: "#FF5A5F",
  warning: "#FFB020",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const touchTarget = {
  // Minimum hit area for primary actions, well above the 44pt/48dp
  // platform baselines to account for gloved hands and motion.
  minHeight: 56,
  minWidth: 56,
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  touchTarget,
  typography,
} as const;

export type Theme = typeof theme;
