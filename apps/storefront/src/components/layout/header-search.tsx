"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchTypeahead } from "./search-typeahead";
import { headerMast, megaMenuBrands } from "@/config/site";

const ALL_BRANDS = "All Brands";

// Header search combo — brand `Select` + `SearchTypeahead` (debounced
// product-suggestion dropdown wrapping the text `Input`) + primary `Button`,
// split into its own "use client" file because shadcn `Select` (Base UI) is
// a client component and the parent `site-header.tsx` is a server component.
//
// Submits a REAL native GET form to `/products` (no router/JS navigation
// required) so it degrades gracefully. `q` and `vendor` are two independent
// params — `vendor` is only rendered when a brand is selected (a real
// Meilisearch facet filter on `/products`, see `products-browser.tsx`), NOT
// string-prepended into `q` like the old pre-Meilisearch implementation.
// The typeahead's own suggestion rows navigate directly to
// `/products/<handle>` or `/quick-order?sku=`, independent of this submit.
export function HeaderSearch() {
  const [brand, setBrand] = useState(ALL_BRANDS);
  const [term, setTerm] = useState("");

  const trimmed = term.trim();
  const vendor = brand === ALL_BRANDS ? undefined : brand;

  return (
    <form
      action="/products"
      method="get"
      role="search"
      className="flex h-11 w-full max-w-[560px] flex-1 items-stretch overflow-hidden rounded-[var(--radius)] border border-athens-line bg-background"
    >
      <input type="hidden" name="q" value={trimmed} />
      {vendor ? <input type="hidden" name="vendor" value={vendor} /> : null}

      <Select value={brand} onValueChange={(value) => setBrand(value as string)}>
        <SelectTrigger
          aria-label="Brand"
          // min-h-full (not h-full): the shared trigger's variant-prefixed
          // data-[size=default]:h-8 outranks a plain h-full on specificity
          // and twMerge keeps both; min-height sidesteps the contest and
          // makes the trigger — and its dashed border-r divider — span the
          // full h-11 row instead of anchoring 32px-tall at the top.
          // Content width (no fixed w-[150px]) matches the reference design.
          className="hidden min-h-full shrink-0 gap-1.5 rounded-none border-0 border-r border-dashed border-athens-line bg-transparent px-4 text-[15px] text-athens-dark [&>svg:last-child]:hidden sm:flex"
        >
          <SelectValue className="flex-none" />
          <span
            aria-hidden="true"
            className="ml-1 h-0 w-0 shrink-0 border-x-4 border-t-[5px] border-x-transparent border-t-athens-dark"
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_BRANDS}>{ALL_BRANDS}</SelectItem>
          {megaMenuBrands.map((option) => (
            <SelectItem key={option.name} value={option.name}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SearchTypeahead
        value={term}
        onChange={setTerm}
        placeholder={headerMast.searchPlaceholder}
        vendor={vendor}
        // h-full replaces the Input primitive's h-8 (same twMerge group) so
        // the text centers in the full row instead of riding 6px high;
        // md:text-[15px] overrides the primitive's md:text-sm so input and
        // trigger text match at desktop widths.
        className="h-full rounded-none border-0 bg-transparent px-4 text-[15px] text-athens-dark shadow-none focus-visible:ring-0 md:text-[15px]"
      />

      <Button
        type="submit"
        variant="default"
        data-icon="inline-start"
        className="h-full shrink-0 rounded-none"
      >
        <SearchIcon />
        {headerMast.searchButtonLabel}
      </Button>
    </form>
  );
}
