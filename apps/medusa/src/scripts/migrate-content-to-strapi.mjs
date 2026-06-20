#!/usr/bin/env node
/**
 * One-time migration: copy `content_post` rows from the Medusa DB into Strapi.
 * Reads the table directly (no dependency on the now-removed content module).
 *
 * Run AFTER Strapi is up and you've created a write-capable API token:
 *
 *   DATABASE_URL=...                       # the Medusa Postgres (same as backend)
 *   STRAPI_URL=https://cms.controlkart.com
 *   STRAPI_TOKEN=...                       # a full-access Strapi API token
 *   node src/scripts/migrate-content-to-strapi.mjs
 *
 * Idempotency: re-running creates duplicates. Run once, or clear the Strapi
 * `posts` collection before re-running.
 */
import pg from "pg"

const { DATABASE_URL, STRAPI_URL, STRAPI_TOKEN } = process.env
if (!DATABASE_URL || !STRAPI_URL || !STRAPI_TOKEN) {
  console.error("Set DATABASE_URL, STRAPI_URL and STRAPI_TOKEN before running.")
  process.exit(1)
}

const client = new pg.Client({
  connectionString: DATABASE_URL.replace(/\?.*$/, ""),
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : { rejectUnauthorized: true },
})

await client.connect()
const { rows } = await client.query(
  `SELECT type, title, slug, excerpt, body, cover_image, seo_title,
          seo_description, related_product_ids, published_at
   FROM content_post
   ORDER BY published_at ASC NULLS LAST`
)
await client.end()
console.log(`Found ${rows.length} content_post rows to migrate.`)

let ok = 0
let fail = 0
for (const r of rows) {
  const payload = {
    data: {
      type: r.type,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt ?? undefined,
      body: r.body ?? undefined,
      cover_image: r.cover_image ?? undefined,
      seo_title: r.seo_title ?? undefined,
      seo_description: r.seo_description ?? undefined,
      related_product_ids: r.related_product_ids ?? undefined,
      publishedAt: r.published_at
        ? new Date(r.published_at).toISOString()
        : null,
    },
  }
  const res = await fetch(`${STRAPI_URL}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })
  if (res.ok) {
    ok++
    console.log(`  ✓ ${r.slug}`)
  } else {
    fail++
    console.log(`  ✗ ${r.slug} — ${res.status} ${await res.text()}`)
  }
}

console.log(`\nDone. ${ok} created, ${fail} failed.`)
console.log(
  "Verify in the Strapi admin and publish any entries that landed as drafts."
)
