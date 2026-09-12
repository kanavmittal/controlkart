# Backend-managed manufacturer branding

The storefront no longer contains a manufacturer list. `/store/brands` derives names and product counts from published Medusa products (`product.metadata.brand`), then joins the artwork and visibility settings saved in the store's `metadata.brand_profiles`.

## Managing brands

1. Open **Products → a product → Brand**. Select or type the manufacturer and save. Clear the field to remove that product's brand. Product updates use the Medusa workflow so search indexing subscribers are notified.
2. Open **Brands** in the Medusa sidebar. Brands discovered on published products appear automatically. You can also add a profile before publishing products.
3. Edit the logo, cover, description and visibility. Upload PNG/JPEG/WebP files up to 5 MB, or use an existing image URL. Leave an image field blank to remove it.
4. Save. All brand directories and selectors use the same backend list. Only enabled brands with published products appear publicly. Products still retain their manufacturer identity if a brand is hidden from the directory.

Existing profile names identify the product metadata they match, so the profile editor does not rename them. To change a product's manufacturer, use its Brand field and configure artwork for the new name. Brand matching ignores case and surrounding whitespace.

The data feeds desktop/mobile navigation and search, homepage brand tiles and filters, deal-tab labels, `/brands`, and the brand cover on `/products?vendor=...`. Product names and manufacturers come from Medusa. Brand links use the vendor filter, not a free-text query. Category switching retains the brand filter. A vendor-filtered catalog loads past the first 100 products so matches are not silently dropped.

New brands without artwork display their name; there is no unrelated fallback logo. The current catalog contains Selec (three published products), so its official logo and Selec equipment cover have been initialized. Individual product images are unchanged.

Changes follow the existing Next.js cache behavior: brand data revalidates after 60 seconds, then the page regenerates on a subsequent request. Refresh an open page to pick up changes. No database migration is needed.

## Initial artwork in another environment

The checked-in artwork is under `apps/medusa/static/brands`. Docker includes that folder. To initialize the Selec profile:

```sh
pnpm --filter @controlkart/medusa setup:brands
```

For a compiled Medusa deployment, from its server directory:

```sh
npx medusa exec ./src/scripts/setup-brand-assets.js
```

The setup is idempotent and preserves an existing profile. Future artwork changes are uploaded through Medusa's configured file provider. Set `NEXT_PUBLIC_MEDUSA_BACKEND_URL` to the public backend origin so backend-relative `/static/...` assets resolve correctly from browsers; absolute uploaded/CDN URLs are used unchanged.

Artwork provenance is in `apps/medusa/static/brands/SOURCES.md`. The cover reuses the previous task's Selec reference-based marketing composition.

## API

- `GET /store/brands`: public catalog directory, using the normal publishable API key.
- `GET /admin/brands`: discovered brands plus configured profiles, including hidden/empty ones.
- `POST /admin/brands`: save one profile; validates names, URLs, visibility and description length, preserving unrelated store metadata.
- `POST /admin/products/:id/brand`: assign or clear one product's manufacturer without altering other metadata.

## Validation

Brand unit tests cover discovery, deduplication, hidden/unused profiles, invalid input, metadata preservation and pagination beyond 500 products. Storefront tests cover vendor URLs, backend media origins and empty/error behavior. Desktop/mobile browser checks confirm live Selec options, artwork and filtered results. The Medusa admin production bundle builds successfully. Full backend type checking still reports the existing quote-workflow errors in `src/workflows/create-quote-request.ts`; no new brand file errors were reported. Authenticated manual admin editing was not verified because the available documented local admin login was rejected in the preceding task.
