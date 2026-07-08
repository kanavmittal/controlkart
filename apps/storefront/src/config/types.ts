// Shared TS shapes for the storefront's typed marketing/config content
// (see plan T4). Modeled loosely on the clone's `src/types.ts`, trimmed to
// what T4 (site chrome + info pages) actually needs.
//
// NOTE(T5): this file will be extended with the home-page + brands + asset
// config shapes (hero slides, promo tiles, popular categories, marquee,
// deals tabs, product-list defs, brand cards, etc.) — do not duplicate those
// shapes here when that task lands.

/** A plain label+href pair used across nav, footer, and menu config. */
export interface NavLink {
  label: string;
  href: string;
}

/** Small pill shown next to a nav label (e.g. "New"). */
export interface NavBadge {
  label: string;
  color: "cyan" | "yellow";
}

export interface MainNavItem extends NavLink {
  badge?: NavBadge;
}

export interface AnnouncementConfig {
  message: string;
  links: NavLink[];
}

export interface HeaderMastConfig {
  /** Rendered as text (no logo mark yet) — see site.ts TODO(content). */
  logoText: string;
  searchPlaceholder: string;
  searchButtonLabel: string;
  phone: string;
  supportEmail: string;
}

/**
 * Shape for a single mega-menu link column (title + href + child links).
 * NOT populated from static config for the category mega-menu — the live
 * category tree is fetched at runtime (T9, via `lib/data/categories.ts`
 * `getCategoryTree()`). This type exists so T9 can build columns of this
 * shape from that live data; `site.ts` never exports a populated array of
 * these for categories.
 */
export interface MegaMenuColumn {
  title: string;
  href: string;
  links: NavLink[];
}

/** One brand tile in the header's "Shop By Brand" mega-menu. */
export interface MegaMenuBrandLink {
  name: string;
  href: string;
}

/** A simple (non-mega) hover dropdown, e.g. "Help Center". */
export interface SimpleMenu {
  label: string;
  links: NavLink[];
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export type SocialIconKey = "facebook" | "instagram" | "linkedin" | "x" | "youtube";

export interface FooterSocialLink {
  label: string;
  href: string;
  icon: SocialIconKey;
}

export type FooterFeatureIconKey = "world" | "phone" | "returns" | "shield";

/** One trust chip rendered by FooterFeatures (T13). No ratings/reviews field
 * — reviews are omitted storewide per plan decision #2. */
export interface FooterFeature {
  icon: FooterFeatureIconKey;
  title: string;
  caption: string;
}

export interface FooterConfig {
  logoText: string;
  address: string[];
  hours: string[];
  columns: FooterColumn[];
  socials: FooterSocialLink[];
  paySecurely: {
    title: string;
    text: string;
  };
  copyright: string;
}

/** One entry of `config/info-pages.ts`, rendered at `/pages/[slug]` (T59). */
export interface InfoPage {
  title: string;
  html: string;
}

/** Icon keys for the PDP `product-block-highlights` chip row
 * (`components/product/buy-box.tsx`) — mapped to lucide icons locally in
 * that component, same pattern as `FooterFeatureIconKey`. */
export type PdpHighlightIconKey = "truck" | "creditCard" | "settings";

/** One bordered chip in the PDP highlights row. */
export interface PdpHighlight {
  icon?: PdpHighlightIconKey;
  text: string;
}

/** The PDP buy column's tinted "info box" callout (Athens
 * `product-info-box-block`) — heading + caption, Box icon. */
export interface PdpInfoBox {
  heading: string;
  caption: string;
}

/** Static PDP copy (`config/site.ts` `pdpContent`), consumed by
 * `product/product-accordions.tsx` (shipping/warranty) and
 * `product/buy-box.tsx` (shipsCaption/infoBox/highlights). */
export interface PdpContentConfig {
  shipping: string;
  warranty: string;
  /** Caption under the stock pill on the PDP stock bar, e.g. "Usually ships
   *  within 24 hours". */
  shipsCaption: string;
  infoBox: PdpInfoBox;
  highlights: PdpHighlight[];
}

// ---------------------------------------------------------------------------
// Home page + brands (T5) — modeled loosely on the clone's `src/types.ts`
// (`PromoTile`, `CategoryTile`, `CategoryLink`, `SlidingPanelData`,
// `ProductListColumn`), adapted so product references are Medusa product
// **handles** (fetched live) instead of baked-in clone product snapshots.
// ---------------------------------------------------------------------------

export interface HeroSlide {
  heading: string;
  caption: string;
  ctaLabel: string;
  href: string;
  image: string;
}

/** Small two-line flag badge overlaid on a tile, e.g. "New" / "Arrivals". */
export interface TileFlag {
  top: string;
  bottom: string;
}

export interface PromoTile {
  title: string;
  caption: string;
  ctaLabel: string;
  href: string;
  /** Either `image` or `video` (or both — video plays over the poster image). */
  image?: string;
  video?: string;
  flag?: TileFlag;
}

/** One cell in the `PopularCategories` mosaic grid. */
export interface PopularCategoryTile {
  title: string;
  href: string;
  image: string;
  /** Mosaic layout hint — spans two grid cells when true. */
  wide?: boolean;
  flag?: TileFlag;
}

/** One chip in the `AlsoPopular` row, or one tile in `SimpleCollections`. */
export interface CategoryChip {
  title: string;
  href: string;
  image: string;
}

export interface CountdownBannerConfig {
  heading: string;
  caption: string;
  ctaLabel: string;
  href: string;
  image: string;
  /** ISO-8601 timestamp the countdown runs down to. */
  targetDate: string;
}

export interface VideoBackgroundConfig {
  video: string;
  heading: string;
  caption: string;
  ctaLabel: string;
  href: string;
}

export interface SlidingPanel {
  title: string;
  caption: string;
  ctaLabel: string;
  href: string;
  image: string;
}

export interface MediaWithTextConfig {
  image: string;
  heading: string;
  caption: string;
  ctaLabel: string;
  href: string;
}

/** One brand tab on the home `DealsTabs` section — products are resolved
 * live from `handles` at render time (T45). */
export interface DealsTab {
  brandLabel: string;
  handles: string[];
}

/** One of the three compact-row columns on the home page — products are
 * resolved live from `handles` at render time (T55). */
export interface ProductListColumnConfig {
  banner: {
    title: string;
    image: string;
    href: string;
  };
  handles: string[];
}

export interface FeaturedCollectionConfig {
  heading: string;
  handles: string[];
  promoTile: PromoTile;
}

/** One entry of `config/brands.ts`, rendered by `ShopByBrand` (T48) and
 * `/brands` (T58). `name` must match the `product.metadata.brand` string
 * values used by the backend so brand links (`/products?q=<brand>`) hit. */
export interface BrandConfig {
  name: string;
  logo: string;
  href: string;
}
