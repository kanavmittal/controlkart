import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Shape of a variant as pulled back from `query.graph()` for this audit —
 * just enough to check the four Shiprocket-required fields plus display
 * columns for the report table.
 */
export type AuditedVariant = {
  id: string
  sku: string | null
  title: string | null
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  product: {
    id: string
    title: string | null
    status: string
  }
}

export type VariantGap = {
  id: string
  sku: string
  productTitle: string
  variantTitle: string
  missingFields: string[]
}

const SHIPPING_FIELDS = ["weight", "length", "width", "height"] as const

/**
 * A field counts as "missing" if it's null/undefined OR zero — a 0kg/0cm
 * variant produces the same silently-wrong Shiprocket freight quote as a
 * null one, so we treat it as a gap too.
 */
function isMissing(value: number | null | undefined): boolean {
  return value === null || value === undefined || value === 0
}

/**
 * Pure gap-detection: given a list of variants (assumed already filtered to
 * published products by the caller's query), return one entry per variant
 * that's missing at least one of weight/length/width/height.
 */
export function findGaps(variants: AuditedVariant[]): VariantGap[] {
  const gaps: VariantGap[] = []

  for (const variant of variants) {
    const missingFields = SHIPPING_FIELDS.filter((field) =>
      isMissing(variant[field])
    )

    if (missingFields.length === 0) {
      continue
    }

    gaps.push({
      id: variant.id,
      sku: variant.sku ?? "(no sku)",
      productTitle: variant.product.title ?? "(untitled product)",
      variantTitle: variant.title ?? "(untitled variant)",
      missingFields,
    })
  }

  return gaps
}

const MAX_TABLE_ROWS = 200

function padRight(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length)
}

function printGapTable(gaps: VariantGap[], limit: number, logger: {
  info: (msg: string) => void
}): void {
  const rows = gaps.slice(0, limit)

  const skuWidth = Math.max(3, ...rows.map((g) => g.sku.length))
  const titleWidth = Math.max(
    5,
    ...rows.map((g) => `${g.productTitle} / ${g.variantTitle}`.length)
  )

  const header = `${padRight("SKU", skuWidth)} | ${padRight(
    "PRODUCT / VARIANT",
    titleWidth
  )} | MISSING FIELDS`
  logger.info(header)
  logger.info("-".repeat(header.length))

  for (const gap of rows) {
    const titleCol = `${gap.productTitle} / ${gap.variantTitle}`
    logger.info(
      `${padRight(gap.sku, skuWidth)} | ${padRight(
        titleCol,
        titleWidth
      )} | ${gap.missingFields.join(",")}`
    )
  }

  if (gaps.length > rows.length) {
    logger.info(`+${gaps.length - rows.length} more`)
  }
}

/**
 * Audits every variant of every PUBLISHED product for the four
 * Shiprocket-required shipping fields (weight/length/width/height).
 *
 * Missing (null) OR zero values are treated as gaps — order-time Shiprocket
 * shipment creation needs real values on all of these, and a silently
 * zero'd field produces a bad freight quote just like a null one.
 *
 * Exit code gates the launch checklist: non-zero (1) when any gaps exist,
 * 0 when the catalog is clean.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/audit-variant-shipping-data.ts
 *
 * Optional env var AUDIT_LIMIT caps how many gap rows are printed in the
 * table (default: all, capped at 200).
 */
export default async function auditVariantShippingData({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "status",
      "variants.id",
      "variants.sku",
      "variants.title",
      "variants.weight",
      "variants.length",
      "variants.width",
      "variants.height",
    ],
    filters: {
      status: "published",
    },
  })

  const variants: AuditedVariant[] = products.flatMap((product) =>
    (product.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      weight: variant.weight,
      length: variant.length,
      width: variant.width,
      height: variant.height,
      product: {
        id: product.id,
        title: product.title,
        status: product.status,
      },
    }))
  )

  const gaps = findGaps(variants)

  const limitEnv = process.env.AUDIT_LIMIT
    ? Number.parseInt(process.env.AUDIT_LIMIT, 10)
    : undefined
  const limit =
    limitEnv !== undefined && Number.isFinite(limitEnv) && limitEnv > 0
      ? Math.min(limitEnv, MAX_TABLE_ROWS)
      : MAX_TABLE_ROWS

  if (gaps.length > 0) {
    printGapTable(gaps, limit, logger)
  }

  logger.info(
    `${gaps.length} of ${variants.length} published variants have gaps`
  )

  if (gaps.length > 0) {
    logger.info("FAIL")
    process.exit(1)
  }

  logger.info("PASS")
}
