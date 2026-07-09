// Typed home-page marketing content (plan T5).
//
// Modeled on the clone's `src/data/sections.ts` (layout/section content) +
// `src/data/products.ts` (product-bearing sections), adapted for
// ControlKart: instead of baking in clone product snapshots, product-bearing
// sections (`dealsTabs`, `featuredProductHandle`, `productListColumns`,
// `featuredCollection`, `homeComparisonHandles`) reference Medusa product
// **handles** that the rendering component resolves live via
// `lib/data/products.ts`.
//
// All imagery under `/marketing/home`, `/marketing/videos`, `/marketing/brands`
// is copied verbatim from the clone (`my-clone/public/images` + `/videos`) as
// a PLACEHOLDER — real ControlKart photography/video is a follow-up content
// task. Every category `href` below points at a plausible ControlKart
// industrial-automation category handle; only the handles already present in
// `apps/medusa/src/scripts/seed.ts` (plcs, hmis, timers-counters,
// energy-meters, vfds, power-supplies, protection-devices, plc-accessories,
// panel-mounted-plcs, wall-mounted-plcs) are backend-confirmed — the rest are
// marked `// TODO(content): confirm handle`. Product handles are ALL
// placeholders (`// TODO(content): real product handles`) — the seeded demo
// catalog only has 3 real products today.
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
  DealsTab,
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
    image: "/marketing/home/athens-v2-slide1a.jpg",
  },
  {
    heading: "Everything for the control panel builder",
    caption:
      "Contactors, terminal blocks, enclosures and wiring accessories — stocked and ready to ship pan-India.",
    ctaLabel: "Shop Panel Building",
    // TODO(content): confirm handle
    href: "/categories/panel-building-accessories",
    image: "/marketing/home/260283.jpg",
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
    image: "/marketing/home/athens-mosaic-05.jpg",
  },
  {
    title: "VFDs & Drives",
    caption:
      "Variable frequency drives for energy-efficient motor control — new stock just landed.",
    ctaLabel: "Shop now",
    href: "/categories/vfds",
    image: "/marketing/home/athens-hero-02a.jpg",
    video: "/marketing/videos/promo-tile-battery-screwdrivers.mp4",
    flag: { top: "New", bottom: "Arrivals" },
  },
  {
    title: "Protection Devices",
    caption:
      "MCBs, MCCBs and overload relays from top brands to keep your panels safe and compliant.",
    ctaLabel: "Shop now",
    href: "/categories/protection-devices",
    image: "/marketing/home/athens-mosaic-03.jpg",
  },
];

// ---------------------------------------------------------------------------
// Popular categories (mosaic)
// ---------------------------------------------------------------------------

export const popularCategories: PopularCategoryTile[] = [
  {
    title: "PLCs",
    href: "/categories/plcs",
    image: "/marketing/home/rotary_01.jpg",
    wide: true,
    flag: { top: "Up to", bottom: "20% Off!" },
  },
  {
    title: "Protection Devices",
    href: "/categories/protection-devices",
    image: "/marketing/home/athens-mosaic-03.jpg",
  },
  {
    title: "HMIs",
    href: "/categories/hmis",
    image: "/marketing/home/athens-mosaic-06.jpg",
  },
  {
    title: "Energy Meters",
    href: "/categories/energy-meters",
    image: "/marketing/home/lf_01.jpg",
  },
  {
    title: "Power Supplies",
    href: "/categories/power-supplies",
    image: "/marketing/home/athens-mosaic-04a.jpg",
  },
  {
    title: "VFDs & Drives",
    href: "/categories/vfds",
    image: "/marketing/home/athens-mosaic-02d.jpg",
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
    image: "/marketing/home/collections-hero_bs.jpg",
  },
  {
    title: "Timers & Counters",
    href: "/categories/timers-counters",
    image: "/marketing/home/collections-hero_cs.jpg",
  },
  {
    title: "Panel-mounted PLCs",
    href: "/categories/panel-mounted-plcs",
    image: "/marketing/home/collections-hero_cd.webp",
  },
  {
    title: "Wall-mounted PLCs",
    href: "/categories/wall-mounted-plcs",
    image: "/marketing/home/collections-hero_cl.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Contactors & Relays",
    href: "/categories/contactors-relays",
    image: "/marketing/home/collections-hero_ct.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Circuit Breakers",
    href: "/categories/circuit-breakers",
    image: "/marketing/home/collections-hero_pp.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Motor Starters",
    href: "/categories/motor-starters",
    image: "/marketing/home/collections-hero_hm.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Industrial Sensors",
    href: "/categories/industrial-sensors",
    image: "/marketing/home/collections-hero_ht.jpg",
  },
  {
    title: "Energy Meters",
    href: "/categories/energy-meters",
    image: "/marketing/home/collections-hero_os.jpg",
  },
  {
    title: "Power Supplies",
    href: "/categories/power-supplies",
    image: "/marketing/home/collections-collection-hero.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Terminal Blocks",
    href: "/categories/terminal-blocks",
    image: "/marketing/home/collections-hero_pw.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Panel Meters",
    href: "/categories/panel-meters",
    image: "/marketing/home/collections-hero_rt.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Servo Drives & Motion Control",
    href: "/categories/servo-drives-motion-control",
    image: "/marketing/home/collections-hero_tk.webp",
  },
  {
    title: "Protection Devices",
    href: "/categories/protection-devices",
    image: "/marketing/home/collections-hero_clearance.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Cable Glands & Accessories",
    href: "/categories/cable-glands-accessories",
    image: "/marketing/home/collections-hero_lbl.jpg",
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
  image: "/marketing/home/bf_banner2.jpg",
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
  video: "/marketing/videos/video-background-craftsmen.mp4",
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
    image: "/marketing/home/athens-mosaic-06.jpg",
  },
  {
    title: "Power Supplies",
    caption: "Regulated DIN-rail power supplies sized for every panel load.",
    href: "/categories/power-supplies",
    ctaLabel: "Shop Power Supplies",
    image: "/marketing/home/athens-mosaic-04a.jpg",
  },
  {
    title: "Protection Devices",
    caption: "MCBs, MCCBs and overload relays that keep your line running safely.",
    href: "/categories/protection-devices",
    ctaLabel: "Shop Protection",
    image: "/marketing/home/athens-mosaic-03.jpg",
  },
  {
    title: "Timers & Counters",
    caption: "Precise timing and counting for sequencing and batch control.",
    href: "/categories/timers-counters",
    ctaLabel: "Shop Timers",
    image: "/marketing/home/athens-mosaic-01a.jpg",
  },
  {
    title: "VFDs & Drives",
    caption: "Energy-efficient variable frequency drives for every motor size.",
    href: "/categories/vfds",
    ctaLabel: "Shop VFDs",
    image: "/marketing/home/athens-mosaic-02d.jpg",
  },
];

// ---------------------------------------------------------------------------
// Simple collections (square tiles)
// ---------------------------------------------------------------------------

export const simpleCollections: CategoryChip[] = [
  {
    // TODO(content): confirm handle
    title: "Panel Meters",
    href: "/categories/panel-meters",
    image: "/marketing/home/athens_measure.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Terminal Blocks",
    href: "/categories/terminal-blocks",
    image: "/marketing/home/athens_clamp.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Contactors & Relays",
    href: "/categories/contactors-relays",
    image: "/marketing/home/athens_hammer.jpg",
  },
  {
    title: "PLC Accessories",
    href: "/categories/plc-accessories",
    image: "/marketing/home/athens_toolset.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Industrial Sensors",
    href: "/categories/industrial-sensors",
    image: "/marketing/home/athens_handtools.jpg",
  },
  {
    // TODO(content): confirm handle
    title: "Motor Starters",
    href: "/categories/motor-starters",
    image: "/marketing/home/athens_chainsaw.jpg",
  },
  {
    title: "PLCs",
    href: "/categories/plcs",
    image: "/marketing/home/collections-hero_rh.jpg",
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
  image: "/marketing/home/about_us_cb03d732-5473-478d-a1f4-995a8e1f32bc.jpg",
};

// ---------------------------------------------------------------------------
// Deals tabs (brand → product handles)
// ---------------------------------------------------------------------------

export const dealsTabs: DealsTab[] = [
  {
    brandLabel: "Selec",
    handles: [
      // Real seeded product — safe to keep.
      "selec-mibrx-6m-modular-plc",
      // TODO(content): real product handles
      "selec-mibrx-dsp-ap-6m-adapter-plate",
      "selec-mibrx-dsp-6m-lcd-display",
      "selec-digital-timer-star-delta",
      "selec-energy-meter-3-phase",
    ],
  },
  {
    // TODO(content): confirm brand + real product handles
    brandLabel: "Siemens",
    handles: [
      "siemens-s7-1200-cpu-1214c",
      "siemens-hmi-kp300-basic",
      "siemens-sirius-mccb-100a",
      "siemens-sitop-power-supply-24v",
      "siemens-sinamics-vfd-2-2kw",
    ],
  },
  {
    // TODO(content): confirm brand + real product handles
    brandLabel: "Schneider Electric",
    handles: [
      "schneider-easy-vfd-2-2kw",
      "schneider-tesys-contactor-9a",
      "schneider-acti9-mcb-32a",
      "schneider-zelio-timer-relay",
      "schneider-modicon-m221-plc",
    ],
  },
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
      image: "/marketing/home/athens-mosaic-05.jpg",
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
      image: "/marketing/home/athens-mosaic-03.jpg",
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
      image: "/marketing/home/product_list_woodwork.jpg",
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
    image: "/marketing/home/collections-collection-hero.jpg",
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
