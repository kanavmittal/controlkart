import { colors, spacing, theme, touchTarget } from "../theme";

describe("theme", () => {
  it("defines a near-black dark background", () => {
    expect(colors.background).toBe("#08090C");
  });

  it("defines high-contrast text and an accent color", () => {
    expect(colors.text).toBeTruthy();
    expect(colors.accent).toBeTruthy();
  });

  it("sizes touch targets for large, gloved-hand taps", () => {
    expect(touchTarget.minHeight).toBeGreaterThanOrEqual(48);
    expect(touchTarget.minWidth).toBeGreaterThanOrEqual(48);
  });

  it("exposes spacing scale and the combined theme object", () => {
    expect(spacing.md).toBe(16);
    expect(theme.colors).toBe(colors);
  });
});
