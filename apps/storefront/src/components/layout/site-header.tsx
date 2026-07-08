import type { ReactNode } from "react";
import Link from "next/link";
import { PhoneIcon, ShoppingCartIcon, UserIcon } from "lucide-react";

import { headerMast } from "@/config/site";
import { HeaderSearch } from "./header-search";

// Sticky site header — Row 1 "mast" ONLY (logo, search combo, phone,
// account/cart icons). Clone ref: my-clone/src/components/SiteHeader.tsx,
// the `bg-white` mast block at L236-292.
//
// The blue mega-menu nav bar (clone L294-307, `<nav className="... bg-
// [#004FC7] ...">`) is intentionally NOT built here — it's T9's job. A
// clearly marked slot is left below for it.
//
// This is a server component: the mast itself needs no client state. The
// search combo needs Base UI's `Select`, which is a client component, so
// it's isolated in the small `header-search.tsx` child (see that file).
interface SiteHeaderProps {
  /**
   * T9 will refactor this component to accept a live `categoryTree` prop
   * (server-fetched via `lib/data/categories.ts`) and render the mega-menu
   * nav bar itself. Until then, an optional `children` slot renders in the
   * nav-bar's place so any earlier caller isn't broken — nothing passes
   * `children` yet (T14 mounts this component, after T9 lands).
   */
  children?: ReactNode;
}

export function SiteHeader({ children }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background">
      {/* Row 1 — Mast */}
      <div className="athens-container flex flex-wrap items-center gap-x-8 gap-y-3 py-3 min-[990px]:h-[95px] min-[990px]:flex-nowrap min-[990px]:py-0">
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

        {/* T11: header-live-actions replaces this */}
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <Link href="/account" aria-label="Account">
            <UserIcon className="h-[26px] w-[26px] text-athens-dark" />
          </Link>
          <Link href="/cart" aria-label="Cart">
            <ShoppingCartIcon className="h-[26px] w-[26px] text-athens-dark" />
          </Link>
        </div>
        {/* end T11 slot */}
      </div>

      {/* T9: nav bar with mega menus */}
      {children}
    </header>
  );
}
