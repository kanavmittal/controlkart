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
// required) so it degrades gracefully; the only client-side behavior is
// combining the brand + free-text term into a single `q` param before
// submit, since that can't be expressed as two separate native fields.
// `/products` doesn't read `?q=` yet — added in T21 — so the full-search
// submit is inert until then by design (see plan T8 note); the typeahead's
// own suggestion rows (T23) navigate directly to `/products/<handle>` or
// `/quick-order?sku=`, independent of that.
export function HeaderSearch() {
  const [brand, setBrand] = useState(ALL_BRANDS);
  const [term, setTerm] = useState("");

  const trimmed = term.trim();
  const q =
    brand === ALL_BRANDS
      ? trimmed
      : trimmed
        ? `${brand} ${trimmed}`
        : brand;

  return (
    <form
      action="/products"
      method="get"
      role="search"
      className="flex h-11 w-full max-w-[560px] flex-1 items-stretch overflow-hidden rounded-[var(--radius)] border border-athens-line bg-background"
    >
      {/* Combined query param — the only thing actually submitted. */}
      <input type="hidden" name="q" value={q} />

      <Select value={brand} onValueChange={(value) => setBrand(value as string)}>
        <SelectTrigger
          aria-label="Brand"
          className="hidden w-[150px] shrink-0 rounded-none border-0 border-r border-athens-line bg-transparent px-4 text-[15px] text-athens-dark sm:flex"
        >
          <SelectValue />
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
        className="rounded-none border-0 bg-transparent px-4 text-[15px] text-athens-dark shadow-none focus-visible:ring-0"
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
