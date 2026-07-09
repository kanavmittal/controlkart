// Typed brand-logo config (plan T5). Rendered by `ShopByBrand` (T48) and the
// `/brands` page (T58). `name` must match the `product.metadata.brand`
// string values the backend uses so brand tiles can safely link through to
// `/products?q=<brand>`. Only "Selec" is confirmed against real seed data
// (`apps/medusa/src/scripts/seed.ts`); the rest are plausible Indian
// industrial-automation brands pending confirmation against the admin's
// actual `metadata.brand` values.
//
// Logos are copied from the clone's stylized `collections-*.png` tiles as
// PLACEHOLDERS — real ControlKart brand logos are a follow-up content task.

import type { BrandConfig } from "./types";

export const brands: BrandConfig[] = [
  {
    name: "Selec",
    logo: "/marketing/brands/Selec.png",
    href: "/brands",
  },
  {
    // TODO(content): confirm against admin brand values
    name: "Siemens",
    logo: "/marketing/brands/Siemens.png",
    href: "/brands",
  },
  {
    // TODO(content): confirm against admin brand values
    name: "Schneider Electric",
    logo: "/marketing/brands/SchneiderElectric.png",
    href: "/brands",
  },
  {
    // TODO(content): confirm against admin brand values
    name: "ABB",
    logo: "/marketing/brands/ABB.png",
    href: "/brands",
  },
  {
    // TODO(content): confirm against admin brand values
    name: "L&T",
    logo: "/marketing/brands/LT.png",
    href: "/brands",
  },
  {
    // TODO(content): confirm against admin brand values
    name: "Havells",
    logo: "/marketing/brands/Havells.png",
    href: "/brands",
  },
  {
    // TODO(content): confirm against admin brand values
    name: "Crompton",
    logo: "/marketing/brands/Crompton.png",
    href: "/brands",
  },
  {
    // TODO(content): confirm against admin brand values
    name: "Delta Electronics",
    logo: "/marketing/brands/DeltaElectronics.png",
    href: "/brands",
  },
];
