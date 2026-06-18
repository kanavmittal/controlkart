# ControlKart Commerce

ControlKart is an India-based distributor of Selec industrial automation products (PLCs first, full catalog later). This monorepo contains the full commerce platform.

## Structure

| Path | Description |
| --- | --- |
| `apps/medusa` | Medusa v2 backend, admin dashboard, custom modules (specs, documents, quotes, content), Razorpay + GST + Shiprocket integrations |
| `apps/storefront` | Custom Next.js App Router storefront (industrial-grade B2B/B2C UX, SEO-first) |
| `packages/ui` | Shared industrial design tokens and UI primitives |
| `packages/types` | Shared TypeScript contracts between backend and storefront |

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 14+
- Redis (optional in dev, required in production)

## Quick start

```bash
pnpm install

# Backend (http://localhost:9000, admin at /app)
cp apps/medusa/.env.template apps/medusa/.env
pnpm --filter @controlkart/medusa medusa db:migrate
pnpm seed
pnpm dev:medusa

# Storefront (http://localhost:3000)
cp apps/storefront/.env.template apps/storefront/.env.local
pnpm dev:storefront
```

## Local credentials (dev)

- Medusa Admin: http://localhost:9000/app — `admin@controlkart.com` / `supersecret`
- Storefront publishable key is pre-set in `apps/storefront/.env.local` (re-printed by the seed script).

## What's implemented

**Backend (Medusa v2)**
- India region, INR with tax-inclusive pricing, GST 18% tax region, Mumbai stock location, pan-India shipping options
- Custom modules: `specs` (dynamic per-category technical specs), `documents` (datasheets/CAD/manuals/certificates), `quotes` (RFQ workflow), `content` (news/case studies/guides)
- Custom store APIs: product specs/documents, quick-order SKU lookup, quote submission, content posts, GST invoice (CGST/SGST vs IGST split)
- Admin extensions: spec editor + document manager widgets on product pages, Quotes dashboard, Content manager
- Customer groups (Retail/Trade/OEM) + Trade price list (`src/scripts/seed-trade-pricing.ts`)
- Env-gated integrations: Razorpay payments, Google sign-in, S3-compatible file storage, Shiprocket fulfillment provider

**Storefront (Next.js App Router)**
- Industrial design system (1440px grid, border-based, SF-Pro-style type)
- Homepage, category pages, PDP with variant selector/spec table/downloads, search, quick order, quote request, resources/blog, cart, 3-step checkout (address+GSTIN → shipping → payment), account with order history and printable GST invoices
- SEO: per-page metadata, Product/Article/Breadcrumb JSON-LD, sitemap.xml, robots.txt, SSG for product/content pages

## Deployment (low-cost self-hosted)

- Storefront: Vercel
- Backend: Railway/Render (separate `medusa start` server + `medusa start --worker` process)
- Database: Neon/Supabase/Railway Postgres
- Redis: Upstash/Railway
- Files: Cloudflare R2 (S3-compatible) via Medusa File Module

All custom business logic lives inside Medusa modules/workflows/providers so the backend stays portable to Medusa Cloud.
