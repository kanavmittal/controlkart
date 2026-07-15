import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type LowStockRow = {
  variant_id: string
  sku: string | null
  title: string | null
  product_title: string | null
  available: number
  stocked: number
  reserved: number
  threshold: number
}

/**
 * Per-variant low-stock threshold convention:
 * `variant.metadata.low_stock_threshold` (number). Defaults to 0, meaning
 * only variants at-or-below-zero available are reported.
 */
const thresholdFor = (metadata: Record<string, unknown> | null): number => {
  const raw = metadata?.low_stock_threshold
  const parsed = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryModule: any = req.scope.resolve(Modules.INVENTORY)

  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Number(req.query.offset) || 0

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "variants.id",
      "variants.sku",
      "variants.title",
      "variants.metadata",
      "variants.inventory_items.inventory_item_id",
    ],
    filters: { status: "published" },
  })

  // variant -> its inventory item ids (variants without an inventory item
  // aren't stock-tracked, so they're skipped entirely).
  const inventoryItemIds = new Set<string>()
  const variants: {
    variant: any
    productTitle: string | null
    itemIds: string[]
  }[] = []

  for (const product of products as any[]) {
    for (const variant of product.variants ?? []) {
      const itemIds = (variant.inventory_items ?? [])
        .map((item: any) => item?.inventory_item_id)
        .filter((id: any): id is string => !!id)
      if (!itemIds.length) {
        continue
      }
      itemIds.forEach((id: string) => inventoryItemIds.add(id))
      variants.push({ variant, productTitle: product.title ?? null, itemIds })
    }
  }

  // Sum stocked/reserved across every level of each inventory item.
  const totalsByItem = new Map<string, { stocked: number; reserved: number }>()
  if (inventoryItemIds.size) {
    const levels = await inventoryModule.listInventoryLevels(
      { inventory_item_id: [...inventoryItemIds] },
      { take: null }
    )
    for (const level of levels as any[]) {
      const totals = totalsByItem.get(level.inventory_item_id) ?? {
        stocked: 0,
        reserved: 0,
      }
      totals.stocked += Number(level.stocked_quantity) || 0
      totals.reserved += Number(level.reserved_quantity) || 0
      totalsByItem.set(level.inventory_item_id, totals)
    }
  }

  const rows: LowStockRow[] = []
  for (const { variant, productTitle, itemIds } of variants) {
    let stocked = 0
    let reserved = 0
    for (const itemId of itemIds) {
      const totals = totalsByItem.get(itemId)
      stocked += totals?.stocked ?? 0
      reserved += totals?.reserved ?? 0
    }
    const available = stocked - reserved
    const threshold = thresholdFor(variant.metadata ?? null)
    if (available <= threshold) {
      rows.push({
        variant_id: variant.id,
        sku: variant.sku ?? null,
        title: variant.title ?? null,
        product_title: productTitle,
        available,
        stocked,
        reserved,
        threshold,
      })
    }
  }

  // Most critical first; stable tie-break so limit/offset pages are sane.
  rows.sort(
    (a, b) =>
      a.available - b.available || (a.sku ?? "").localeCompare(b.sku ?? "")
  )

  res.json({
    variants: rows.slice(offset, offset + limit),
    count: rows.length,
    limit,
    offset,
  })
}
