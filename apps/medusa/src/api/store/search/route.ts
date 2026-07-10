import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"
import type { SearchHitDocument } from "../../../modules/meilisearch/service"

type SearchHitResponse = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  vendor: string | null
  price: { amount: number; currency_code: string } | null
  /** Category `handle` is included so the typeahead's "Suggestions" column
   *  can link straight to `/products?category=<handle>`. */
  categories: { id: string; name: string; handle: string }[]
}

/** Maps the raw Meilisearch index document shape to the storefront-facing
 *  contract (nested `price`). */
function toSearchHitResponse(hit: SearchHitDocument): SearchHitResponse {
  const price =
    hit.price_amount !== null && hit.currency_code !== null
      ? { amount: hit.price_amount, currency_code: hit.currency_code }
      : null
  return {
    id: hit.id,
    title: hit.title,
    handle: hit.handle,
    thumbnail: hit.thumbnail,
    vendor: hit.vendor,
    price,
    categories: hit.categories.map((category) => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
    })),
  }
}

const MAX_QUERY_LENGTH = 256
const DEFAULT_LIMIT = 6
const MAX_LIMIT = 100
// Matches Medusa's product-category id shape (e.g. "pcat_01H...").
const CATEGORY_ID_PATTERN = /^[A-Za-z0-9_-]+$/

function parseLimit(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_LIMIT
  }
  return Math.min(Math.floor(n), MAX_LIMIT)
}

/** Header/typeahead + /products free-text search, backed by Meilisearch.
 *  Public, publishable-key-scoped like other /store routes — no middleware
 *  entry needed. Never returns 500 for a Meilisearch outage: unconfigured
 *  or unreachable both come back as `{ degraded: true, hits: [] }` with a
 *  200, which storefront callers fall back on (local text scan on
 *  /products, no results in the header dropdown). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const rawQ = typeof req.query.q === "string" ? req.query.q.trim() : ""
  if (!rawQ) {
    res.status(400).json({ message: "`q` is required" })
    return
  }
  if (rawQ.length > MAX_QUERY_LENGTH) {
    res.status(400).json({
      message: `\`q\` must be ${MAX_QUERY_LENGTH} characters or fewer`,
    })
    return
  }

  const rawVendor =
    typeof req.query.vendor === "string" ? req.query.vendor.trim() : ""
  if (rawVendor && (rawVendor.includes('"') || rawVendor.includes("\\"))) {
    res.status(400).json({ message: "`vendor` contains unsupported characters" })
    return
  }

  // Ids failing the allowlist are silently dropped rather than erroring the
  // whole request — a malformed id here just means that one filter clause
  // doesn't narrow anything, not a client error worth rejecting.
  const categoryIds =
    typeof req.query.category_ids === "string"
      ? req.query.category_ids
          .split(",")
          .map((id) => id.trim())
          .filter((id) => CATEGORY_ID_PATTERN.test(id))
      : []

  const limit = parseLimit(req.query.limit)

  const filterClauses: string[] = []
  if (categoryIds.length) {
    const list = categoryIds.map((id) => `"${id}"`).join(", ")
    filterClauses.push(`categories.id IN [${list}]`)
  }
  if (rawVendor) {
    filterClauses.push(`vendor = "${rawVendor}"`)
  }
  const filter = filterClauses.length ? filterClauses.join(" AND ") : undefined

  const meilisearchService: MeilisearchModuleService = req.scope.resolve(
    MEILISEARCH_MODULE
  )

  if (!meilisearchService.isConfigured) {
    res.json({ degraded: true, hits: [] })
    return
  }

  try {
    const hits = await meilisearchService.search({ q: rawQ, filter, limit })
    res.json({ degraded: false, hits: hits.map(toSearchHitResponse) })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.warn(`[meilisearch] /store/search degraded: ${(error as Error).message}`)
    res.json({ degraded: true, hits: [] })
  }
}
