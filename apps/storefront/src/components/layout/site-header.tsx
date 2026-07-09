import Link from "next/link";
import { PhoneIcon } from "lucide-react";

import { headerMast } from "@/config/site";
import { HeaderSearch } from "./header-search";
import { HeaderLiveActions } from "./header-live-actions";
import { MegaMenu, type MegaMenuCategory } from "./mega-menu";
import { MobileMenu } from "./mobile-menu";

// Sticky site header — Row 1 "mast" (logo, search combo, phone,
// account/cart icons) plus Row 2, the blue mega-menu nav bar (T9). Clone
// ref: my-clone/src/components/SiteHeader.tsx, the `bg-white` mast block at
// L236-292 and the `<nav className="... bg-[#004FC7] ...">` block at
// L294-307.
//
// This is a server component: the mast itself needs no client state. The
// search combo needs Base UI's `Select`, and the nav bar needs hover/focus
// state, so both are isolated in small "use client" children
// (`header-search.tsx`, `mega-menu.tsx`).
interface SiteHeaderProps {
  /**
   * Live category tree, server-fetched via `lib/data/categories.ts`
   * `getCategoryTree()` by the layout (T14) and passed straight through to
   * both the desktop mega-menu (Row 2) and the mobile Sheet nav (T10).
   */
  categoryTree: MegaMenuCategory[];
}

export function SiteHeader({ categoryTree }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background">
      {/* Row 1 — Mast */}
      <div className="athens-container flex flex-wrap items-center gap-x-8 gap-y-3 py-3 min-[990px]:h-[95px] min-[990px]:flex-nowrap min-[990px]:py-0">
        <MobileMenu categories={categoryTree} />

        <Link
          href="/"
          className="shrink-0 text-xl font-bold tracking-tight text-athens-dark"
        >
          {headerMast.logoText}
        </Link>

        <div className="hidden min-w-0 flex-1 min-[990px]:flex">
          <HeaderSearch />
        </div>

        <div className="hidden shrink-0 items-center gap-3 min-[1200px]:flex">
          <PhoneIcon className="h-[26px] w-[26px] text-athens-dark" aria-hidden />
          <div className="flex flex-col">
            <span className="text-[15px] font-medium text-athens-dark">
              {headerMast.phone}
            </span>
            <span className="text-[13px] text-athens-body">
              {headerMast.supportEmail}
            </span>
          </div>
        </div>

        <div className="ml-auto shrink-0">
          <HeaderLiveActions />
        </div>
      </div>

      {/* Row 2 — Nav bar (mega menus) */}
      <MegaMenu categoryTree={categoryTree} />
    </header>
  );
}
