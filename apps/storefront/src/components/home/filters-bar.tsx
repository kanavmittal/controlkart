"use client";

/**
 * Home "finder" band (T46) — clone ref: my-clone `src/components/FiltersBar.tsx`.
 *
 * The clone's 3-dropdown finder (Brand / Category / Power source) is purely
 * decorative — its native `<select>`s aren't wired to anything, and the
 * third ("Power source") has zero options and is permanently disabled.
 * ControlKart has a real data source for two of the three: Brand
 * (`@/config/brands`) and Category (the top-level list, passed in via the
 * `categories` prop — T57 supplies `listTopLevelCategories()`'s result, see
 * `StoreCategory` in `@/lib/data/categories`). There's no ControlKart
 * equivalent of "power source" (no such config or facet), so per plan that
 * third dropdown is OMITTED rather than rendered disabled/empty like the
 * clone — this component renders just the two functional dropdowns + Search.
 *
 * Rebuilt on shadcn `Select` (Base UI) instead of the clone's raw native
 * `<select>`; "use client" because the finder is interactive (local
 * selection state + router navigation on submit) and `Select` itself is a
 * client component.
 *
 * Routing on submit:
 *  - both selected            -> `/categories/<handle>` (category wins —
 *    brand can't filter a category page server-side, and the category page
 *    is the more specific browse target than a keyword search).
 *  - category only selected   -> `/categories/<handle>`.
 *  - brand only selected      -> `/products?q=<brand>` (brand is a
 *    `metadata.brand` string, not a facet endpoint, so `/products`'s
 *    existing `?q=` full-text search is the only way to surface it — same
 *    choice the plan makes for header search / ShopByBrand tiles, see the
 *    plan's "Brand links" open item).
 *  - neither selected         -> `/products` (browse everything).
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brands } from "@/config/brands";
import type { StoreCategory } from "@/lib/data/categories";

const ALL_BRANDS = "All Brands";
const ALL_CATEGORIES = "All Categories";

export interface FiltersBarProps {
  /** Top-level categories only (T57 passes `listTopLevelCategories()`). */
  categories: StoreCategory[];
}

export function FiltersBar({ categories }: FiltersBarProps) {
  const router = useRouter();
  const [brand, setBrand] = React.useState(ALL_BRANDS);
  const [categoryHandle, setCategoryHandle] = React.useState(ALL_CATEGORIES);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hasBrand = brand !== ALL_BRANDS;
    const hasCategory = categoryHandle !== ALL_CATEGORIES;

    if (hasCategory) {
      router.push(`/categories/${categoryHandle}`);
    } else if (hasBrand) {
      router.push(`/products?q=${encodeURIComponent(brand)}`);
    } else {
      router.push("/products");
    }
  };

  return (
    <section className="athens-container mt-[55px] mb-6">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 min-[750px]:flex-row min-[750px]:items-end"
      >
        <div className="min-[750px]:flex-1">
          <label className="mb-1.5 block text-[13px] text-[#232323]">
            Choose a brand...
          </label>
          <Select value={brand} onValueChange={(value) => setBrand(value as string)}>
            <SelectTrigger className="h-[47px] w-full rounded-[5px] border-[#dfdfdf] bg-white px-4 text-[15px] text-[#676767]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BRANDS}>{ALL_BRANDS}</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.name} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-[750px]:flex-1">
          <label className="mb-1.5 block text-[13px] text-[#232323]">
            Choose a category
          </label>
          <Select
            value={categoryHandle}
            onValueChange={(value) => setCategoryHandle(value as string)}
          >
            <SelectTrigger className="h-[47px] w-full rounded-[5px] border-[#dfdfdf] bg-white px-4 text-[15px] text-[#676767]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>{ALL_CATEGORIES}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.handle}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="h-[47px] w-full min-[750px]:w-[180px]">
          Search
        </Button>
      </form>
    </section>
  );
}

/** Plain hairline divider used below the finder band — kept in this file
 * because the clone defines it alongside `FiltersBar` in the same source
 * file (`FiltersBar.tsx`), not as a separate component. */
export function SectionDivider() {
  return (
    <div className="athens-container mt-[60px] mb-0 w-full">
      <hr className="border-0 border-t border-[#dfdfdf]" />
    </div>
  );
}
