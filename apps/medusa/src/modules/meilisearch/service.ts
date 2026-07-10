import type { Logger } from "@medusajs/framework/types"

// Pinned to 0.56.0 (see package.json) — 0.57+ dropped the CJS build this
// CommonJS-compiled backend needs; do not bump past 0.56.x without also
// moving this package to ESM output. Even 0.56.0's package.json declares
// "type": "module" (only its exports map's "require" condition is CJS), which
// trips up TS's Node16 dual-package type resolution on a static `import` —
// it resolves the "types" condition as ESM-only regardless of the runtime
// "require" target. Loading via `require()` sidesteps that entirely; the
// local `MeiliIndex`/`MeiliClient` types below cover the exact subset of the
// client surface this service uses, so our own code stays fully typed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MeiliSearch } = require("meilisearch") as {
  MeiliSearch: new (config: { host: string; apiKey?: string }) => MeiliClient
}

export type MeilisearchOptions = {
  host?: string
  apiKey?: string
  productIndexName?: string
}

type InjectedDependencies = {
  logger: Logger
}

export type ProductDocument = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  handle: string
  thumbnail: string | null
  vendor: string | null
  mpn: string | null
  skus: string[]
  categories: { id: string; name: string; handle: string }[]
  price_amount: number | null
  currency_code: string | null
  status: string
  created_at: string
}

/** `addDocuments`/`deleteDocuments` resolve as soon as the write is
 *  *enqueued* (HTTP 202), not once Meilisearch has actually processed it —
 *  an enqueued task can still fail asynchronously (e.g. a malformed
 *  document). The client attaches a `.waitTask()` convenience directly on
 *  the returned promise that polls until the task reaches a terminal
 *  status; callers here use it so "the write succeeded" means the document
 *  is actually indexed, not just accepted. */
type EnqueuedTaskPromiseLike = Promise<{ taskUid: number }> & {
  waitTask(): Promise<{ status: string; error: unknown }>
}

/** Minimal shape of the meilisearch client surface this service uses —
 *  see the `require("meilisearch")` note above for why this isn't imported
 *  from the package's own types. */
type MeiliIndex = {
  updateSearchableAttributes(attrs: string[]): Promise<unknown>
  updateFilterableAttributes(attrs: string[]): Promise<unknown>
  updateSortableAttributes(attrs: string[]): Promise<unknown>
  updateTypoTolerance(config: {
    enabled: boolean
    disableOnAttributes: string[]
    minWordSizeForTypos: { oneTypo: number; twoTypos: number }
  }): Promise<unknown>
  updateSynonyms(synonyms: Record<string, string[]>): Promise<unknown>
  addDocuments(
    docs: ProductDocument[],
    opts: { primaryKey: string }
  ): EnqueuedTaskPromiseLike
  deleteDocuments(ids: string[]): EnqueuedTaskPromiseLike
  getDocuments(params: {
    ids?: string[]
    limit?: number
    offset?: number
    fields?: string[]
  }): Promise<{ results: ProductDocument[] }>
  search(
    q: string,
    opts: {
      filter?: string
      limit: number
      attributesToRetrieve: string[]
      rankingScoreThreshold?: number
    }
  ): Promise<{ hits: SearchHitDocument[] }>
}

type MeiliClient = {
  index(name: string): MeiliIndex
}

const DEFAULT_INDEX_NAME = "products"

// Order matters: Meilisearch's `attribute` ranking rule scores matches in
// earlier attributes higher.
const SEARCHABLE_ATTRIBUTES = [
  "title",
  "skus",
  "mpn",
  "vendor",
  "categories.name",
  "subtitle",
  "description",
]
const FILTERABLE_ATTRIBUTES = ["categories.id", "vendor", "price_amount"]
const SORTABLE_ATTRIBUTES = ["price_amount", "created_at", "title"]
// Part numbers/SKUs must be exact/prefix matches — typo tolerance on them
// produces false positives across visually-similar codes (e.g. "CK-4501-B"
// vs "CK-4501-C"), which matters more in an industrial-parts catalog than
// in general retail.
//
// minWordSizeForTypos is lowered from Meilisearch's {5, 9} defaults because
// this catalog's vocabulary is dominated by short acronyms (VFD, PLC, HMI,
// DIN): with the default, a 3-letter query like "vfk" gets ZERO typo
// allowance and misses "VFD" entirely. oneTypo:3 lets 3+-letter words carry
// one typo. Aggressiveness is bounded by Meilisearch itself: a typo on a
// word's FIRST letter counts as two typos (so "kfd" still won't match
// "vfd"), and the `typo` ranking rule sorts exact matches above fuzzy ones.
const TYPO_TOLERANCE = {
  enabled: true,
  disableOnAttributes: ["skus", "mpn"],
  minWordSizeForTypos: { oneTypo: 3, twoTypos: 7 },
}

// One-way per entry (user vocabulary → indexed tokens); two-way pairs are
// spelled out in both directions where both forms appear in product copy.
// Multi-word synonyms are phrase-matched — keep them ≤3 words.
const SYNONYMS: Record<string, string[]> = {
  drive: ["vfd"],
  "ac drive": ["vfd"],
  vsd: ["vfd"],
  inverter: ["vfd"],
  vfd: ["variable frequency drive"],
  "variable frequency drive": ["vfd"],
  plc: ["programmable logic controller"],
  "programmable logic controller": ["plc"],
  hmi: ["human machine interface"],
  "human machine interface": ["hmi"],
  "touch panel": ["hmi"],
  psu: ["power supply", "smps"],
  smps: ["power supply"],
  "power supply": ["smps"],
}

// Query-time floor on Meilisearch's normalized ranking score — trims the
// garbage tail that looser typo tolerance would otherwise let through.
const RANKING_SCORE_THRESHOLD = 0.2

const RESULT_ATTRIBUTES = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "vendor",
  "price_amount",
  "currency_code",
  "categories",
] as const

/** Exactly the fields `search()` requests via `attributesToRetrieve` — kept
 *  narrower than `ProductDocument` so callers (T7's /store/search route)
 *  can't accidentally read a field the search response doesn't actually
 *  carry (e.g. `description`, `skus`). */
export type SearchHitDocument = Pick<
  ProductDocument,
  (typeof RESULT_ATTRIBUTES)[number]
>

/**
 * Thin wrapper around the Meilisearch JS client. Unconditionally registered
 * in medusa-config.ts (unlike the conditionally-spread Redis modules) but
 * degrades to a no-op when `host` is unset, so local dev runs without a
 * Meilisearch instance.
 *
 * No-op scope is deliberately narrow: it only applies when unconfigured.
 * Once configured, write methods (indexData/deleteFromIndex) let errors
 * propagate — a broken index write should fail the calling
 * workflow/subscriber loudly rather than silently diverge from Postgres.
 * Only the read path (search) is expected to be wrapped in a try/catch by
 * its caller (the /store/search route) to degrade a live storefront request
 * gracefully instead of swallowing here.
 */
class MeilisearchModuleService {
  private client: MeiliClient | null = null
  private indexName: string
  private logger: Logger
  private settingsApplied = false

  constructor(
    { logger }: InjectedDependencies,
    options: MeilisearchOptions = {}
  ) {
    this.logger = logger
    this.indexName = options.productIndexName || DEFAULT_INDEX_NAME

    if (options.host) {
      this.client = new MeiliSearch({
        host: options.host,
        apiKey: options.apiKey,
      })
      // Apply index settings eagerly at boot (fire-and-forget) so a deploy
      // that changes them takes effect immediately — the lazy calls in
      // indexData()/search() remain as retry paths if Meilisearch is
      // unreachable right now (`settingsApplied` only flips on success).
      void this.ensureIndexSettings().catch((error) => {
        this.logger.warn(
          `[meilisearch] Could not apply index settings at boot (will retry lazily): ${
            (error as Error).message
          }`
        )
      })
    } else {
      this.logger.warn(
        "[meilisearch] MEILISEARCH_HOST is not set — indexing and search " +
          "are disabled; storefront search falls back to its degraded/local behavior."
      )
    }
  }

  private get index(): MeiliIndex {
    if (!this.client) {
      throw new Error("Meilisearch is not configured")
    }
    return this.client.index(this.indexName)
  }

  /** Lets callers (the /store/search route) distinguish "unconfigured" from
   *  "configured but the request itself failed" — `search()` returns `[]`
   *  for both, so this is the only way to tell them apart without relying
   *  on an empty result meaning something it doesn't (a real query can
   *  legitimately have zero matches). */
  get isConfigured(): boolean {
    return this.client !== null
  }

  /** Applies searchable/filterable/sortable/typo-tolerance settings once per
   *  process. Meilisearch creates the index implicitly on first settings
   *  write if it doesn't exist yet. */
  private async ensureIndexSettings(): Promise<void> {
    if (this.settingsApplied || !this.client) {
      return
    }
    const index = this.index
    await Promise.all([
      index.updateSearchableAttributes(SEARCHABLE_ATTRIBUTES),
      index.updateFilterableAttributes(FILTERABLE_ATTRIBUTES),
      index.updateSortableAttributes(SORTABLE_ATTRIBUTES),
      index.updateTypoTolerance(TYPO_TOLERANCE),
      index.updateSynonyms(SYNONYMS),
    ])
    this.settingsApplied = true
  }

  /** Add/update documents. No-ops when unconfigured; throws — including on
   *  an asynchronously-failed indexing task, not just an HTTP-level failure
   *  — when configured (see class doc and `EnqueuedTaskPromiseLike`). */
  async indexData(docs: ProductDocument[]): Promise<void> {
    if (!this.client || !docs.length) {
      return
    }
    await this.ensureIndexSettings()
    const task = await this.index
      .addDocuments(docs, { primaryKey: "id" })
      .waitTask()
    if (task.status === "failed") {
      throw new Error(
        `Meilisearch indexData task failed: ${JSON.stringify(task.error)}`
      )
    }
  }

  /** Remove documents by id. Deleting an id that was never indexed is a
   *  no-op in Meilisearch, so this is safe to call unconditionally (e.g. for
   *  products that are already unpublished/never synced). Throws on an
   *  asynchronously-failed deletion task, same as `indexData`. */
  async deleteFromIndex(ids: string[]): Promise<void> {
    if (!this.client || !ids.length) {
      return
    }
    const task = await this.index.deleteDocuments(ids).waitTask()
    if (task.status === "failed") {
      throw new Error(
        `Meilisearch deleteFromIndex task failed: ${JSON.stringify(task.error)}`
      )
    }
  }

  async retrieveFromIndex(ids: string[]): Promise<ProductDocument[]> {
    if (!this.client || !ids.length) {
      return []
    }
    // Meilisearch's documents endpoint defaults `limit` to 20 — without this,
    // requesting more than 20 ids would silently truncate the result.
    const result = await this.index.getDocuments({ ids, limit: ids.length })
    return result.results
  }

  /** Read path — callers (the /store/search route) are expected to catch
   *  errors here and degrade gracefully rather than 500ing the request. */
  async search({
    q,
    filter,
    limit,
  }: {
    q: string
    filter?: string
    limit: number
  }): Promise<SearchHitDocument[]> {
    if (!this.client) {
      return []
    }
    // Retry path for settings that failed to apply at boot — a no-op
    // (flag-guarded) once they've succeeded.
    await this.ensureIndexSettings()
    const result = await this.index.search(q, {
      filter,
      limit,
      attributesToRetrieve: [...RESULT_ATTRIBUTES],
      rankingScoreThreshold: RANKING_SCORE_THRESHOLD,
    })
    return result.hits
  }

  /** All ids currently in the index, for the full-resync orphan-reconciliation
   *  sweep (T6) — pages through Meilisearch's document listing. */
  async allIndexedIds(): Promise<string[]> {
    if (!this.client) {
      return []
    }
    const ids: string[] = []
    const limit = 1000
    let offset = 0
    for (;;) {
      const page = await this.index.getDocuments({
        limit,
        offset,
        fields: ["id"],
      })
      ids.push(...page.results.map((doc) => doc.id))
      if (page.results.length < limit) {
        break
      }
      offset += limit
    }
    return ids
  }
}

export default MeilisearchModuleService
