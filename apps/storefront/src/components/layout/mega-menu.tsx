"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { helpCenterMenu, mainNav, navEnd } from "@/config/site"
import { megaMenuBrands } from "@/config/site"
import type { MainNavItem, MegaMenuColumn, NavLink } from "@/config/types"
import type { StoreCategory } from "@/lib/data/categories"

/** The shape `getCategoryTree()` (`lib/data/categories.ts`) resolves — same
 * tree shape `MobileMenu` (T10) consumes. */
export type MegaMenuCategory = StoreCategory & { children: StoreCategory[] }

interface MegaMenuProps {
  categoryTree: MegaMenuCategory[]
}

// Hardcoded feature tile for the category mega-menu's 5th column. No config
// export exists for this (plan T9: "fine to hardcode one image + link");
// asset lives in the T5 marketing placeholder set.
const CATEGORY_FEATURE_TILE = {
  image: "/marketing/home/athens-hero-02a.jpg",
  heading: "Built for industrial floors",
  text: "Browse the full catalog of controls & automation parts",
  href: "/categories",
}

const MEGA_MENU_LABELS = new Set(["Shop By Category", "Shop By Brand"])

const SIMPLE_MENUS: Record<string, NavLink[]> = {
  [helpCenterMenu.label]: helpCenterMenu.links,
}

function hasSubmenu(label: string): boolean {
  return MEGA_MENU_LABELS.has(label) || label in SIMPLE_MENUS
}

/** Groups the live category tree into `MegaMenuColumn` shapes (one per
 * top-level category), then distributes those across a fixed number of
 * visual columns (round-robin by index) so any number of top-level
 * categories still lays out as a 4-column panel. */
function useCategoryColumns(categoryTree: MegaMenuCategory[], columnCount = 4) {
  const groups: MegaMenuColumn[] = categoryTree.map((category) => ({
    title: category.name,
    href: `/categories/${category.handle}`,
    links: (category.children ?? category.category_children ?? []).map((child) => ({
      label: child.name,
      href: `/categories/${child.handle}`,
    })),
  }))

  const columns: MegaMenuColumn[][] = Array.from({ length: columnCount }, () => [])
  groups.forEach((group, index) => {
    columns[index % columnCount].push(group)
  })
  return columns
}

function NavBadge({ badge }: { badge: NonNullable<MainNavItem["badge"]> }) {
  return (
    <span
      className={cn(
        "absolute -top-[10px] left-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.02em]",
        badge.color === "cyan" && "bg-[#47D7F5] text-white",
        badge.color === "yellow" && "bg-athens-dark text-[#FFD51D]"
      )}
    >
      {badge.label}
    </span>
  )
}

function CategoryMegaMenu({ categoryTree }: { categoryTree: MegaMenuCategory[] }) {
  const columns = useCategoryColumns(categoryTree)

  return (
    <div className="grid grid-cols-5 gap-8">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-6">
          {column.map((group) => (
            <div key={group.title}>
              <Link
                href={group.href}
                className="mb-3 block text-[15px] font-medium text-athens-dark hover:underline"
              >
                {group.title}
              </Link>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[14px] leading-8 text-athens-body hover:text-athens-dark hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
      <Link
        href={CATEGORY_FEATURE_TILE.href}
        className="relative block min-h-[220px] overflow-hidden rounded-[5px]"
      >
        <Image
          src={CATEGORY_FEATURE_TILE.image}
          alt={CATEGORY_FEATURE_TILE.heading}
          fill
          sizes="280px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
          <p className="text-[15px] font-medium text-white">{CATEGORY_FEATURE_TILE.heading}</p>
          <p className="text-[13px] text-white/85">{CATEGORY_FEATURE_TILE.text}</p>
        </div>
      </Link>
    </div>
  )
}

// The `megaMenuBrands` config (config/site.ts) has no logo asset yet
// (`{ name, href }` only — see plan "Open items flagged: brand links go to
// /products?q=<brand>"), so brand tiles render as bordered logotype cards
// rather than images, matching the clone's grid layout without inventing
// image assets.
function BrandMegaMenu() {
  return (
    <div className="grid grid-cols-6 gap-4">
      {megaMenuBrands.map((brand) => (
        <Link
          key={brand.name}
          href={brand.href}
          className="flex h-14 items-center justify-center rounded-[5px] px-2 text-center ring-1 ring-athens-line transition-shadow hover:ring-athens-dark"
        >
          <span className="text-[14px] font-semibold text-athens-dark">{brand.name}</span>
        </Link>
      ))}
    </div>
  )
}

function SimpleDropdown({ links }: { links: NavLink[] }) {
  return (
    <ul className="min-w-[220px] rounded-[5px] bg-background py-2 ring-1 ring-athens-line">
      {links.map((link) => (
        <li key={link.label}>
          <Link
            href={link.href}
            className="block px-4 py-2 text-[14px] font-normal normal-case tracking-normal text-athens-body hover:bg-muted hover:text-athens-dark"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function NavItem({
  item,
  categoryTree,
  openMenu,
  setOpenMenu,
}: {
  item: MainNavItem
  categoryTree: MegaMenuCategory[]
  openMenu: string | null
  setOpenMenu: (label: string | null) => void
}) {
  const itemRef = useRef<HTMLLIElement>(null)
  const submenu = hasSubmenu(item.label)
  const isMega = MEGA_MENU_LABELS.has(item.label)
  const isOpen = openMenu === item.label

  const open = () => submenu && setOpenMenu(item.label)
  const close = () => setOpenMenu(null)

  return (
    <li
      ref={itemRef}
      className={cn("h-full", !isMega && "relative")}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={(event) => {
        if (!itemRef.current?.contains(event.relatedTarget as Node | null)) {
          close()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          close()
          itemRef.current?.querySelector("a")?.focus()
        }
      }}
    >
      <Link
        href={item.href}
        className="relative flex h-full items-center text-[13px] font-medium uppercase tracking-[0.02em] text-primary-foreground outline-none transition-opacity hover:opacity-85 focus-visible:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={(event) => {
          // Inert triggers ("#") only ever open/close the panel; real hrefs
          // (e.g. "Shop By Brand" -> /brands) still navigate normally.
          if (submenu && item.href === "#") {
            event.preventDefault()
            setOpenMenu(isOpen ? null : item.label)
          }
        }}
      >
        {item.badge && <NavBadge badge={item.badge} />}
        {item.label}
        {submenu && (
          <ChevronDownIcon
            className="ml-1.5 h-[10px] w-[10px] text-primary-foreground"
            aria-hidden="true"
          />
        )}
      </Link>
      {submenu && (
        <div
          className={cn(
            "absolute top-full z-50 transition-opacity duration-200",
            isMega ? "left-0 right-0" : "left-0",
            isOpen ? "visible opacity-100" : "invisible opacity-0"
          )}
        >
          {isMega ? (
            <div className="border-b border-athens-line bg-background py-8 shadow-[0_20px_30px_rgba(0,0,0,0.08)]">
              <div className="athens-container">
                {item.label === "Shop By Category" ? (
                  <CategoryMegaMenu categoryTree={categoryTree} />
                ) : (
                  <BrandMegaMenu />
                )}
              </div>
            </div>
          ) : (
            <div className="shadow-[0_20px_30px_rgba(0,0,0,0.08)]">
              <SimpleDropdown links={SIMPLE_MENUS[item.label] ?? []} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Row 2 — the blue mega-menu nav bar. Hand-rolled hover/focus state (not
 * shadcn `navigation-menu`): the Base UI `NavigationMenu` primitive
 * positions its popup relative to the trigger via a floating-ui Positioner
 * (sized to `--popup-width`/portal-based), which fights the full-bleed,
 * viewport-width panel Athens uses under the whole nav bar. Plan T9 names
 * this hand-rolled port as the pre-approved fallback for exactly this case.
 * `nav` is `relative` so the panels (`absolute left-0 right-0 top-full`)
 * anchor to the bar, not the trigger.
 */
export function MegaMenu({ categoryTree }: MegaMenuProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  return (
    <nav className="relative hidden bg-primary md:block">
      <div className="athens-container">
        <ul className="flex h-[52px] items-center gap-7">
          {mainNav.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              categoryTree={categoryTree}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />
          ))}
          <li className="ml-auto h-full" aria-hidden />
          {navEnd.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              categoryTree={categoryTree}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />
          ))}
        </ul>
      </div>
    </nav>
  )
}
