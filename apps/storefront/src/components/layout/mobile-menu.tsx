"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, ShoppingCart, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { helpCenterMenu, mainNav, navEnd } from "@/config/site"
import type { StoreCategory } from "@/lib/data/categories"

/** The shape `getCategoryTree()` (`lib/data/categories.ts`) resolves: top-level
 * categories with their immediate children attached. Deeper levels, if ever
 * populated on `category_children` (the native Medusa field), are walked too
 * — see `CategoryAccordionItem` below — but today's fetcher only guarantees
 * two levels, matching the desktop mega-menu (T9). */
export type MobileMenuCategory = StoreCategory & { children?: StoreCategory[] }

interface MobileMenuProps {
  categories: MobileMenuCategory[]
}

/**
 * Hamburger trigger + left-side Sheet nav for ≤768px viewports. Self-contained:
 * mounts both the trigger button and the Sheet, so a parent only needs to
 * render `<MobileMenu categories={...} />` once. Category data is passed in
 * (fetched server-side by the layout in T14) — this component does no data
 * fetching itself.
 */
export function MobileMenu({ categories }: MobileMenuProps) {
  const [open, setOpen] = React.useState(false)
  const close = React.useCallback(() => setOpen(false), [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="border-none md:hidden"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="size-6" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[85%] gap-0 overflow-y-auto p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="sr-only">Site navigation</SheetTitle>
          <Link
            href="/"
            onClick={close}
            className="font-heading text-lg font-semibold text-foreground"
          >
            ControlKart
          </Link>
        </SheetHeader>

        <nav className="flex flex-1 flex-col overflow-y-auto pb-4">
          {/* Category tree */}
          <Accordion multiple className="border-b border-border px-2 py-1">
            {categories.map((category) => (
              <CategoryAccordionItem
                key={category.id}
                category={category}
                onNavigate={close}
              />
            ))}
          </Accordion>

          {/* Static primary + end nav from config/site.ts (skip inert "#"
           * entries — those open desktop-only hover menus; "Help Center"'s
           * links are rendered separately below). */}
          <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3">
            {[...mainNav, ...navEnd]
              .filter((item) => item.href !== "#")
              .map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className="py-2 text-[15px] font-medium text-foreground"
                >
                  {item.label}
                </Link>
              ))}
          </div>

          {/* Help Center simple menu */}
          <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3">
            <span className="py-1 text-[13px] font-medium tracking-[0.02em] text-muted-foreground uppercase">
              {helpCenterMenu.label}
            </span>
            {helpCenterMenu.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="py-1.5 text-[14px] text-muted-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Account + cart */}
          <div className="mt-auto flex flex-col gap-1 px-4 pt-3">
            <Link
              href="/account"
              onClick={close}
              className="flex items-center gap-2.5 py-2 text-[15px] font-medium text-foreground"
            >
              <User className="size-[18px]" aria-hidden="true" />
              Account
            </Link>
            <Link
              href="/cart"
              onClick={close}
              className="flex items-center gap-2.5 py-2 text-[15px] font-medium text-foreground"
            >
              <ShoppingCart className="size-[18px]" aria-hidden="true" />
              Cart
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

/**
 * One node of the accordion category tree, recursive. A category with no
 * children renders as a plain leaf link (`/categories/<handle>`); a category
 * with children renders as an `AccordionItem` whose panel opens with a
 * "Shop all <name>" link followed by a nested `Accordion` for its children.
 * Reads `category.children` first (the field `getCategoryTree()` attaches to
 * top-level results), falling back to the native `category_children` field
 * for any deeper levels.
 */
function CategoryAccordionItem({
  category,
  onNavigate,
}: {
  category: MobileMenuCategory
  onNavigate: () => void
}) {
  const children = category.children ?? category.category_children ?? []

  if (children.length === 0) {
    return (
      <Link
        href={`/categories/${category.handle}`}
        onClick={onNavigate}
        className="block border-b border-border px-2 py-2.5 text-[15px] font-medium text-foreground not-last:border-b"
      >
        {category.name}
      </Link>
    )
  }

  return (
    <AccordionItem value={category.id}>
      <AccordionTrigger className="px-2 text-[15px] font-medium text-foreground">
        {category.name}
      </AccordionTrigger>
      <AccordionContent className="pb-1 pl-2">
        <Link
          href={`/categories/${category.handle}`}
          onClick={onNavigate}
          className="block py-2 text-[14px] font-medium text-primary underline-offset-2 hover:underline"
        >
          Shop all {category.name}
        </Link>
        <Accordion multiple className="border-t border-border/60 pl-2">
          {children.map((child) => (
            <CategoryAccordionItem
              key={child.id}
              category={child}
              onNavigate={onNavigate}
            />
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  )
}
