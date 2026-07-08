// Site chrome content (announcement bar, header mast, nav, mega-menu
// non-category data, footer). Modeled on the clone's `src/data/site.ts`,
// rewritten for ControlKart: an India-based B2B distributor of industrial
// controls (PLCs, contactors, VFDs, switchgear, automation parts).
//
// Route rewrites applied throughout: clone `/collections/<x>` -> our
// `/categories/<x>`; `/pages/shop-by-brand` -> `/brands`; `/pages/<slug>`
// kept as-is for info pages; clone blog (`/blogs/news`) -> `/resources`.
//
// IMPORTANT: the category mega-menu is NOT hardcoded here. Column data for
// "Shop By Category" comes from the live category tree at request time
// (T9, via `lib/data/categories.ts` `getCategoryTree()`), typed as
// `MegaMenuColumn[]` (see `./types`). This file only holds static nav
// labels and the non-category menus (brands, help center, quick links).
import type {
  AnnouncementConfig,
  FooterConfig,
  FooterFeature,
  HeaderMastConfig,
  MainNavItem,
  MegaMenuBrandLink,
  SimpleMenu,
} from "./types";

export const announcement: AnnouncementConfig = {
  message: "GST invoices on every order · Bulk & institutional pricing available",
  links: [
    { label: "Customer FAQ", href: "/pages/customer-faq" },
    { label: "Delivery Options", href: "/pages/delivery-options" },
    { label: "About Us", href: "/pages/about-us" },
    { label: "Contact Us", href: "/pages/contact-us" },
  ],
};

export const headerMast: HeaderMastConfig = {
  logoText: "ControlKart",
  searchPlaceholder: "Search by product, brand or part number",
  searchButtonLabel: "Search",
  phone: "+91 00000 00000", // TODO(content): confirm support phone number
  supportEmail: "support@controlkart.example", // TODO(content): confirm support email
};

// Brand tiles for the header's "Shop By Brand" mega-menu panel. Links route
// through the in-memory product search (brand is a `product.metadata.brand`
// string, not a facet endpoint — see plan "Open items flagged"), matching
// the `/brands` page's own link strategy (T58).
// TODO(content): confirm these names match live `metadata.brand` values
// exactly (case/punctuation) once the catalog is seeded.
export const megaMenuBrands: MegaMenuBrandLink[] = [
  { name: "Siemens", href: "/products?q=Siemens" },
  { name: "Schneider Electric", href: "/products?q=Schneider%20Electric" },
  { name: "ABB", href: "/products?q=ABB" },
  { name: "L&T", href: "/products?q=L%26T" },
  { name: "Havells", href: "/products?q=Havells" },
  { name: "Mitsubishi Electric", href: "/products?q=Mitsubishi%20Electric" },
];

// Primary nav bar (left-aligned). "Shop By Category" opens the live
// category mega-menu (T9) — its href is inert ("#") because the menu itself
// is the destination. "Help Center" opens the `helpCenterMenu` simple
// dropdown below. Both are recognized by label in the header component,
// same pattern as the clone.
export const mainNav: MainNavItem[] = [
  { label: "Shop By Category", href: "#" },
  { label: "Shop By Brand", href: "/brands" },
  { label: "Resources", href: "/resources" },
  { label: "Help Center", href: "#" },
];

// Right-aligned nav bar — static, non-category B2B utility links (existing
// preserved routes; see plan ground rules).
export const navEnd: MainNavItem[] = [
  { label: "Quick Order", href: "/quick-order" },
  { label: "Request a Quote", href: "/request-quote" },
];

export const helpCenterMenu: SimpleMenu = {
  label: "Help Center",
  links: [
    { label: "Customer FAQ", href: "/pages/customer-faq" },
    { label: "Delivery Options", href: "/pages/delivery-options" },
    { label: "Refunds & Returns", href: "/pages/refunds-returns" },
    { label: "About Us", href: "/pages/about-us" },
    { label: "Contact Us", href: "/pages/contact-us" },
  ],
};

// Trust chips rendered by FooterFeatures (T13). No ratings/reviews chip —
// omitted storewide per plan decision #2.
export const footerFeatures: FooterFeature[] = [
  {
    icon: "world",
    title: "Pan-India Delivery",
    caption: "Shipped via our logistics partner to serviceable pincodes nationwide",
  },
  {
    icon: "phone",
    title: "Talk to Sales",
    caption: "Bulk & OEM pricing, spec help — reach the team via Contact Us",
  },
  {
    icon: "returns",
    title: "Easy Replacements",
    caption: "Defective-on-arrival items replaced — see our Refunds & Returns policy",
  },
  {
    icon: "shield",
    title: "GST Invoicing",
    caption: "GST-compliant tax invoice generated automatically on every order",
  },
];

export const footer: FooterConfig = {
  logoText: "ControlKart",
  address: [
    "ControlKart Industrial Supplies Pvt. Ltd.", // TODO(content): confirm registered legal entity name
    "Address line 1, Address line 2", // TODO(content): registered address
    "City, State - PIN", // TODO(content): registered address
    "GSTIN: 00AAAAA0000A0Z0", // TODO(content): confirm GSTIN
  ],
  hours: [
    "Mon-Sat 9:30am-6:30pm IST", // TODO(content): confirm support hours
  ],
  columns: [
    {
      title: "Useful Links",
      links: [
        { label: "Refunds & Returns", href: "/pages/refunds-returns" },
        { label: "Delivery Options", href: "/pages/delivery-options" },
        { label: "Customer FAQ", href: "/pages/customer-faq" },
        { label: "Privacy Policy", href: "/pages/privacy-policy" },
        { label: "Terms & Conditions", href: "/pages/terms-conditions" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/pages/about-us" },
        { label: "Contact Us", href: "/pages/contact-us" },
        { label: "Shop By Brand", href: "/brands" },
        { label: "Resources", href: "/resources" },
      ],
    },
    {
      title: "For Business",
      links: [
        { label: "Quick Order", href: "/quick-order" },
        { label: "Request a Quote", href: "/request-quote" },
        { label: "My Account", href: "/account" },
      ],
    },
  ],
  socials: [
    { label: "Facebook", href: "#", icon: "facebook" }, // TODO(content)
    { label: "Instagram", href: "#", icon: "instagram" }, // TODO(content)
    { label: "LinkedIn", href: "#", icon: "linkedin" }, // TODO(content)
    { label: "X", href: "#", icon: "x" }, // TODO(content)
    { label: "YouTube", href: "#", icon: "youtube" }, // TODO(content)
  ],
  paySecurely: {
    title: "Pay Securely",
    text: "UPI, cards and net banking via Razorpay, plus NEFT/RTGS for approved quotes. GST tax invoices are issued automatically on every order.",
  },
  copyright: `© ${new Date().getFullYear()}, ControlKart`,
};
