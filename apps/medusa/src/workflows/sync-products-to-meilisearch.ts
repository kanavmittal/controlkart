import {
  createStep,
  createWorkflow,
  transform,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { QueryContext } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import type MeilisearchModuleService from "../modules/meilisearch/service"
import type { ProductDocument } from "../modules/meilisearch/service"
import { deleteProductsFromMeilisearchStep } from "./delete-products-from-meilisearch"

export type SyncProductsToMeilisearchInput = {
  /** Product ids to (re)sync. Omit to sync every product matching no id
   *  filter (i.e. the whole catalog) — callers doing a full resync (T6)
   *  page this themselves in chunks rather than relying on that default. */
  filters?: { id?: string[] }
}

const PRODUCT_FIELDS = [
  "id",
  "title",
  "subtitle",
  "description",
  "handle",
  "thumbnail",
  "status",
  "metadata",
  "created_at",
  "categories.id",
  "categories.name",
  "categories.handle",
  "variants.sku",
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.currency_code",
]

type RawProduct = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  handle: string
  thumbnail: string | null
  status: string
  metadata: Record<string, unknown> | null
  created_at: string
  categories?: { id: string; name: string; handle: string }[]
  variants?: {
    sku: string | null
    calculated_price?: {
      calculated_amount: number | null
      currency_code: string | null
    } | null
  }[]
}

function toDocument(product: RawProduct): ProductDocument {
  const variants = product.variants ?? []
  const skus = variants
    .map((v) => v.sku)
    .filter((sku): sku is string => typeof sku === "string" && sku.length > 0)
  const prices = variants
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")
  const cheapest = prices.length ? Math.min(...prices) : null
  const currencyVariant = variants.find(
    (v) => typeof v.calculated_price?.currency_code === "string"
  )

  const metadata = product.metadata ?? {}
  const vendor = typeof metadata.brand === "string" ? metadata.brand : null
  const mpn = typeof metadata.mpn === "string" ? metadata.mpn : null

  return {
    id: product.id,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description ? product.description.slice(0, 300) : null,
    handle: product.handle,
    thumbnail: product.thumbnail,
    vendor,
    mpn,
    skus,
    categories: (product.categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
    })),
    price_amount: cheapest,
    currency_code: currencyVariant?.calculated_price?.currency_code ?? null,
    status: product.status,
    created_at: product.created_at,
  }
}

/** Indexes the given (or, if `filters.id` is omitted, all) products'
 *  currently-published state and removes anything non-published from the
 *  index in the same run — so a product moved to draft is correctly pulled
 *  out, not just left stale. */
const syncProductsToMeilisearchStep = createStep(
  "sync-products-to-meilisearch",
  async (input: { docs: ProductDocument[] }, { container }) => {
    const meilisearchService: MeilisearchModuleService =
      container.resolve(MEILISEARCH_MODULE)
    await meilisearchService.indexData(input.docs)
    return new StepResponse(input.docs.map((doc) => doc.id))
  }
)

export const syncProductsWorkflow = createWorkflow(
  "sync-products-to-meilisearch",
  function (input: SyncProductsToMeilisearchInput) {
    const { data: regions } = useQueryGraphStep({
      entity: "region",
      fields: ["id", "currency_code", "countries.iso_2"],
    }).config({ name: "list-regions-for-meilisearch-sync" })

    // India-first region selection, same selector the storefront uses for
    // its single-region setup — resolved here (not passed in) since this
    // workflow also runs from subscribers/scheduled jobs with no request
    // context to source a region from.
    const queryConfig = transform({ regions, input }, (data) => {
      const india = data.regions.find((region) =>
        (region.countries ?? []).some((country) => country?.iso_2 === "in")
      )
      const region = india ?? data.regions[0]
      return {
        filters: data.input.filters ?? {},
        context: {
          variants: {
            calculated_price: QueryContext({
              region_id: region?.id,
              currency_code: region?.currency_code,
            }),
          },
        },
      }
    })

    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: queryConfig.filters,
      context: queryConfig.context,
    }).config({ name: "list-products-for-meilisearch-sync" })

    const { published, unpublishedIds } = transform({ products }, (data) => {
      const published: ProductDocument[] = []
      const unpublishedIds: string[] = []
      for (const product of data.products as RawProduct[]) {
        if (product.status === "published") {
          published.push(toDocument(product))
        } else {
          unpublishedIds.push(product.id)
        }
      }
      return { published, unpublishedIds }
    })

    syncProductsToMeilisearchStep({ docs: published })
    deleteProductsFromMeilisearchStep({ ids: unpublishedIds })

    return new WorkflowResponse({ synced: published, removed: unpublishedIds })
  }
)
