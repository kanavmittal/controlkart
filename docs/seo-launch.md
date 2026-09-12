# ControlKart SEO launch notes

Public URL: https://controlkart.com. `SEO_BASE_URL` controls canonical metadata, sitemap links and organization identity independently of local download URLs. Set `NEXT_PUBLIC_BASE_URL=https://controlkart.com` in the production build environment too.

## Implemented

- CK favicon at `/icon.svg`, PNG icons at 192 and 512 pixels, Apple touch icon, and web manifest.
- Default 1200 × 630 Open Graph/Twitter preview at `/social-image`.
- Organization and WebSite structured data with the approved logo and business telephone.
- Existing page titles, descriptions and canonical links; noindex metadata on account, checkout, cart, comparison and authentication pages.
- Sitemap paginates products and articles beyond the first 100 records. Categories currently use the shared 200-category API limit.
- Product structured data includes untracked/backorderable inventory and escapes embedded JSON safely. Category breadcrumbs use absolute URLs.

## Deployment checks still required

1. Deploy with a public HTTPS Medusa URL and the production publishable key. Product photos must have publicly accessible URLs, not localhost URLs.
2. Verify HTTPS and redirect www/HTTP to the canonical https://controlkart.com host. Restrict preview deployments from indexing at the hosting layer.
3. Open `/robots.txt`, `/sitemap.xml`, `/icon.svg`, `/manifest.webmanifest`, and `/social-image` on the real domain. Confirm representative category, product and article pages return 200 and unknown handles return 404.
4. Verify domain ownership in Google Search Console and submit https://controlkart.com/sitemap.xml. Test representative pages with Google's Rich Results Test and inspect social sharing previews.
5. Confirm the authorized-distributor wording, business address, support email, delivery/returns policies and article content are accurate before publishing.

Search engines decide indexing, displayed titles and rich-result eligibility; correct metadata cannot guarantee ranking or search appearance.

References: https://nextjs.org/docs/app/api-reference/functions/generate-metadata and https://developers.google.com/search/docs/appearance/favicon-in-search
