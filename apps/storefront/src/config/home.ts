// Typed home-page marketing content (plan T5).
//
// Modeled on the clone's `src/data/sections.ts` (layout/section content) +
// `src/data/products.ts` (product-bearing sections), adapted for
// ControlKart: instead of baking in clone product snapshots, product-bearing
// sections (`dealProductHandles`, `featuredProductHandle`, `productListColumns`,
// `featuredCollection`, `homeComparisonHandles`) reference Medusa product
// **handles** that the rendering component resolves live via
// `lib/data/products.ts`.
//
// Category photography is sourced from Selec; provenance is recorded in
// public/marketing/selec/sources.json. Product handles below are unchanged.
// Additional product families use catalog searches until Medusa categories exist.
//
// Interfaces live in `./types` (extended by this task — see NOTE(T5) there).

import type {
  HeroSlide,
  PromoTile,
  PopularCategoryTile,
  CategoryChip,
  CountdownBannerConfig,
  VideoBackgroundConfig,
  SlidingPanel,
  MediaWithTextConfig,
  ProductListColumnConfig,
  FeaturedCollectionConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export const heroSlides: HeroSlide[] = [
  {
    heading: "Automation components for every panel",
    caption:
      "PLCs, HMIs, VFDs and protection devices from trusted brands — built for Indian industrial and OEM applications.",
    ctaLabel: "Shop PLCs & Automation",
    href: "/categories/plcs",
    image: "/marketing/selec/automation-hero.jpg",
  },
  {
    heading: "Everything for the control panel builder",
    caption:
      "Selec meters, timers, power supplies and monitoring relays for industrial control panels.",
    ctaLabel: "Shop Panel Building",
    // TODO(content): confirm handle
    href: "/categories",
    image: "/marketing/selec/panel-hero.jpg",
  },
];

// ---------------------------------------------------------------------------
// Promo tiles
// ---------------------------------------------------------------------------

export const promoTiles: PromoTile[] = [
  {
    title: "Timers & Counters",
    caption:
      "Digital and analog timers for delay, cyclic, and star-delta starter control across your production line.",
    ctaLabel: "Shop now",
    href: "/categories/timers-counters",
    image: "/marketing/selec/timers-counters.jpg",
  },
  {
    title: "VFDs & Drives",
    caption:
      "Variable frequency drives for energy-efficient motor control — new stock just landed.",
    ctaLabel: "Shop now",
    href: "/categories/vfds",
    image: "/marketing/selec/vfds.jpg",
  },
  {
    title: "Protection Devices",
    caption:
      "Selec voltage, phase and current monitoring relays for dependable panel protection.",
    ctaLabel: "Shop now",
    href: "/categories/protection-devices",
    image: "/marketing/selec/protection-devices.jpg",
  },
];

// ---------------------------------------------------------------------------
// Popular categories (mosaic)
// ---------------------------------------------------------------------------

export const popularCategories: PopularCategoryTile[] = [
  {
    title: "PLCs",
    href: "/categories/plcs",
    image: "/marketing/selec/plcs.jpg",
    wide: true,
  },
  {
    title: "Protection Devices",
    href: "/categories/protection-devices",
    image: "/marketing/selec/protection-devices.jpg",
  },
  {
    title: "HMIs",
    href: "/categories/hmis",
    image: "/marketing/selec/hmis.jpg",
  },
  {
    title: "Energy Meters",
    href: "/categories/energy-meters",
    image: "/marketing/selec/energy-meters.jpg",
  },
  {
    title: "Power Supplies",
    href: "/categories/power-supplies",
    image: "/marketing/selec/power-supplies.jpg",
  },
  {
    title: "VFDs & Drives",
    href: "/categories/vfds",
    image: "/marketing/selec/vfds.jpg",
    wide: true,
  },
];

// ---------------------------------------------------------------------------
// Also popular (category chips)
// ---------------------------------------------------------------------------

export const alsoPopular: CategoryChip[] = [
  {
    title: "PLC Accessories",
    href: "/categories/plc-accessories",
    image: "/marketing/selec/plc-accessories.jpg",
  },
  {
    title: "Timers & Counters",
    href: "/categories/timers-counters",
    image: "/marketing/selec/timers-counters.jpg",
  },
  {
    title: "Panel-mounted PLCs",
    href: "/products?q=MiBRX",
    image: "/marketing/selec/panel-mounted-plcs.jpg",
  },
  {
    title: "PLC Displays",
    href: "/products?q=MiBRX%20DSP",
    image: "/marketing/selec/plc-displays.jpg",
  },
  {
    title: "Relay Modules",
    href: "/products?q=relay",
    image: "/marketing/selec/relay-modules.jpg",
  },
  {
    title: "Earth Leakage Relays",
    href: "/products?q=earth%20leakage",
    image: "/marketing/selec/earth-leakage.jpg",
  },
  {
    title: "Motor Protection",
    href: "/products?q=motor%20protection",
    image: "/marketing/selec/motor-protection.jpg",
  },
  {
    title: "Temperature Controllers",
    href: "/products?q=temperature",
    image: "/marketing/selec/temperature-controllers.jpg",
  },
  {
    title: "Energy Meters",
    href: "/categories/energy-meters",
    image: "/marketing/selec/energy-meters.jpg",
  },
  {
    title: "Power Supplies",
    href: "/categories/power-supplies",
    image: "/marketing/selec/power-supplies.jpg",
  },
  {
    title: "Communication Accessories",
    href: "/products?q=converter",
    image: "/marketing/selec/communication-accessories.jpg",
  },
  {
    title: "Panel Meters",
    href: "/products?q=meter",
    image: "/marketing/selec/panel-meters.jpg",
  },
  {
    title: "Fixed IO PLCs",
    href: "/products?q=PLC",
    image: "/marketing/selec/fixed-io-plcs.jpg",
  },
  {
    title: "Protection Devices",
    href: "/categories/protection-devices",
    image: "/marketing/selec/protection-devices.jpg",
  },
  {
    title: "Current Transformers",
    href: "/products?q=current%20transformer",
    image: "/marketing/selec/current-transformers.jpg",
  },
];

// ---------------------------------------------------------------------------
// Countdown banner
// ---------------------------------------------------------------------------

export const countdownBanner: CountdownBannerConfig = {
  heading: "Monsoon stock clearance!",
  caption:
    "Limited-period pricing on select PLCs, VFDs and protection devices. While stocks last.",
  ctaLabel: "Shop deals",
  // TODO(content): confirm handle
  href: "/categories/protection-devices",
  image: "/marketing/selec/panel-hero.jpg",
  // TODO(content): placeholder — set to the real campaign end date/time (IST) before launch.
  targetDate: "2026-09-06T23:59:59+05:30",
};

// ---------------------------------------------------------------------------
// Marquee
// ---------------------------------------------------------------------------

export const marquee: string[] = [
  "Pan-India delivery",
  "GST invoicing on every order",
  "Trade & OEM pricing available",
  "Genuine parts, warranty backed",
];

// ---------------------------------------------------------------------------
// Video background
// ---------------------------------------------------------------------------

export const videoBackground: VideoBackgroundConfig = {
  heading: "Built for the panel. Trusted by engineers.",
  caption:
    "From single-machine retrofits to plant-wide automation, ControlKart stocks the components your build depends on.",
  ctaLabel: "Shop PLCs & Automation",
  href: "/categories/plcs",
  image: "/marketing/selec/automation-hero.jpg",
};

// ---------------------------------------------------------------------------
// Sliding panels
// ---------------------------------------------------------------------------

export const slidingPanels: SlidingPanel[] = [
  {
    title: "HMIs",
    caption: "Touchscreen operator panels for clear, reliable machine control.",
    href: "/categories/hmis",
    ctaLabel: "Shop HMIs",
    image: "/marketing/selec/hmis.jpg",
  },
  {
    title: "Power Supplies",
    caption: "Regulated DIN-rail power supplies sized for every panel load.",
    href: "/categories/power-supplies",
    ctaLabel: "Shop Power Supplies",
    image: "/marketing/selec/power-supplies.jpg",
  },
  {
    title: "Protection Devices",
    caption: "Voltage, phase and current monitoring relays for industrial panels.",
    href: "/categories/protection-devices",
    ctaLabel: "Shop Protection",
    image: "/marketing/selec/protection-devices.jpg",
  },
  {
    title: "Timers & Counters",
    caption: "Precise timing and counting for sequencing and batch control.",
    href: "/categories/timers-counters",
    ctaLabel: "Shop Timers",
    image: "/marketing/selec/timers-counters.jpg",
  },
  {
    title: "VFDs & Drives",
    caption: "Energy-efficient variable frequency drives for every motor size.",
    href: "/categories/vfds",
    ctaLabel: "Shop VFDs",
    image: "/marketing/selec/vfds.jpg",
  },
];

// ---------------------------------------------------------------------------
// Simple collections (square tiles)
// ---------------------------------------------------------------------------

export const simpleCollections: CategoryChip[] = [
  {
    title: "Panel Meters",
    href: "/products?q=meter",
    image: "/marketing/selec/panel-meters.jpg",
  },
  {
    title: "Communication Accessories",
    href: "/products?q=converter",
    image: "/marketing/selec/communication-accessories.jpg",
  },
  {
    title: "Relay Modules",
    href: "/products?q=relay",
    image: "/marketing/selec/relay-modules.jpg",
  },
  {
    title: "PLC Accessories",
    href: "/categories/plc-accessories",
    image: "/marketing/selec/plc-accessories.jpg",
  },
  {
    title: "Temperature Controllers",
    href: "/products?q=temperature",
    image: "/marketing/selec/temperature-controllers.jpg",
  },
  {
    title: "Motor Protection",
    href: "/products?q=motor%20protection",
    image: "/marketing/selec/motor-protection.jpg",
  },
  {
    title: "PLCs",
    href: "/categories/plcs",
    image: "/marketing/selec/plcs.jpg",
  },
];

// ---------------------------------------------------------------------------
// Media with text
// ---------------------------------------------------------------------------

export const mediaWithText: MediaWithTextConfig = {
  heading: "Serving Indian industry since day one",
  caption:
    "ControlKart stocks automation and control components from brands like Selec, so panel builders, OEMs and maintenance teams can source what they need without the wait. From single components to full BOMs, our team helps you find the right part for the job.",
  ctaLabel: "Learn more",
  href: "/pages/about-us",
  image: "/marketing/selec/automation-hero.jpg",
};

// ---------------------------------------------------------------------------
// Deals tabs (brand → product handles)
// ---------------------------------------------------------------------------

// Curated product selection; tab names come from each product's backend brand.
export const dealProductHandles = [
  "selec-mibrx-6m-modular-plc",
  "selec-mibrx-dsp-ap-6m-adapter-plate",
  "selec-mibrx-dsp-6m-lcd-display",
];

// ---------------------------------------------------------------------------
// Featured product
// ---------------------------------------------------------------------------

// TODO(content): placeholder — confirm the handle to feature on the homepage.
export const featuredProductHandle = "selec-mibrx-6m-modular-plc";

// ---------------------------------------------------------------------------
// Product list columns (3 columns x 5 handles)
// ---------------------------------------------------------------------------

export const productListColumns: ProductListColumnConfig[] = [
  {
    banner: {
      title: "PLCs",
      image: "/marketing/selec/plcs.jpg",
      href: "/categories/plcs",
    },
    handles: [
      // Real seeded product — safe to keep.
      "selec-mibrx-6m-modular-plc",
      // TODO(content): real product handles
      "selec-mibrx-dsp-ap-6m-adapter-plate",
      "siemens-s7-1200-cpu-1214c",
      "schneider-modicon-m221-plc",
      "abb-ac500-plc-cpu",
    ],
  },
  {
    banner: {
      title: "VFDs & Drives",
      image: "/marketing/selec/vfds.jpg",
      href: "/categories/vfds",
    },
    // TODO(content): real product handles
    handles: [
      "schneider-easy-vfd-2-2kw",
      "siemens-sinamics-vfd-2-2kw",
      "abb-acs580-vfd-4kw",
      "lt-vfd-1-5kw",
      "delta-vfd-el-2-2kw",
    ],
  },
  {
    banner: {
      title: "Protection Devices",
      image: "/marketing/selec/protection-devices.jpg",
      href: "/categories/protection-devices",
    },
    // TODO(content): real product handles
    handles: [
      "siemens-sirius-mccb-100a",
      "schneider-acti9-mcb-32a",
      "lt-mccb-100a-tp",
      "havells-mcb-32a-spn",
      "abb-overload-relay-9a",
    ],
  },
];

// ---------------------------------------------------------------------------
// Featured collection
// ---------------------------------------------------------------------------

export const featuredCollection: FeaturedCollectionConfig = {
  heading: "PLCs & Automation",
  // TODO(content): real product handles
  handles: [
    "selec-mibrx-6m-modular-plc",
    "selec-mibrx-dsp-ap-6m-adapter-plate",
    "selec-mibrx-dsp-6m-lcd-display",
    "siemens-s7-1200-cpu-1214c",
    "siemens-hmi-kp300-basic",
    "schneider-modicon-m221-plc",
    "abb-ac500-plc-cpu",
  ],
  promoTile: {
    title: "PLCs & Automation",
    caption:
      "Compact and modular PLCs for machine control and plant automation, from brands built for industrial duty.",
    ctaLabel: "Shop now",
    href: "/categories/plcs",
    image: "/marketing/selec/plcs.jpg",
  },
};

// ---------------------------------------------------------------------------
// Home comparison section
// ---------------------------------------------------------------------------

// TODO(content): placeholder — real product handles for the pinned home comparison.
export const homeComparisonHandles: string[] = [
  "selec-mibrx-6m-modular-plc",
  "siemens-s7-1200-cpu-1214c",
  "schneider-modicon-m221-plc",
  "abb-ac500-plc-cpu",
  "lt-plc-compact-16i-o",
];
