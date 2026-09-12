# Storefront badges

In Medusa Admin, open a product or category detail page and find **Storefront badges**.

- Click **Add badge**, enter a label (for example `New Arrival`, `20% Off`, or `Best Seller`), and choose Blue, Red, or Dark.
- Add up to three labels, each up to 40 characters, displayed in the order entered.
- Click **Save badges**. Remove a label and save to hide it; removing all labels hides all custom badges.
- Products also have **Show automatic discount badge from product pricing**, enabled by default. This controls only the price-derived percentage label, not prices or the price comparison display.
- Custom badges are marketing text. To actually discount a product, configure its pricing in Medusa.
- New-arrival labels are explicitly configured; creation dates no longer automatically mark products as new.
- Availability-derived `Sold out` labels remain automatic.

Product labels appear on product cards, product details, quick view, featured products and compact product lists. Category labels appear on homepage category promotions, category shortcuts, sliding panels, category cards and category detail pages. Category labels belong to the category itself; they do not silently propagate to individual products or child categories. Search shortcuts without a matching Medusa category have no category badges.

Changes follow the existing storefront cache refresh, with product and category fetches using a 60-second revalidation interval. On a production ISR page, the first request after the interval can serve the previous page while it regenerates; refresh again after regeneration. An already-open tab does not push-update automatically.

## Storage and API

No migration is needed. The authenticated routes are:

- `GET/POST /admin/products/:id/badges`
- `GET/POST /admin/product-categories/:id/badges`

Example POST body:

```json
{
  "badges": [
    { "label": "New Arrival", "tone": "new" },
    { "label": "OEM Offer", "tone": "custom" }
  ],
  "show_sale_badge": true
}
```

Allowed tones are `new` (blue), `sale` (red), and `custom` (dark). Writes validate length, count, duplicate labels, tone and boolean settings before changing anything. The server merges `storefront_badges` and `show_sale_badge` into the latest metadata, preserving brand, HSN, footnotes and other fields. Frontend readers ignore malformed badge entries and render labels as plain text.

## Verification

- 19 backend unit tests cover validation and product/category route reads, saves, removals, metadata preservation, and failed persistence.
- 6 badge-specific storefront tests cover rendering derivation, hiding, invalid metadata, duplicate limits, real discounts and stock badges; the full storefront suite has 31 passing tests.
- Frontend TypeScript and targeted ESLint pass.
- Unauthenticated live admin badge requests return 401; browser inspection confirms hard-coded homepage flags are absent.
- Full backend TypeScript checking remains blocked by existing errors in `src/workflows/create-quote-request.ts` (lines 36, 49, 50). The new badge files have no reported TypeScript errors.
- An authenticated admin UI save still needs verification; the local development login documented in README was rejected.
