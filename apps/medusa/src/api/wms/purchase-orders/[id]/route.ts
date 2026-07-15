import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  attachSuppliers,
  getPurchaseOrderWithLines,
} from "../../../../workflows/create-purchase-order"

/**
 * Warehouse-app-facing PO detail: supplier + full lines, each line annotated
 * with a `serialized` boolean resolved from the variant's metadata
 * (`variant.metadata.serialized === true`; defaults to false when absent).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const purchaseOrder = await getPurchaseOrderWithLines(req.scope, req.params.id)
  const [withSupplier] = await attachSuppliers(req.scope, [purchaseOrder])

  const lines = withSupplier.lines ?? []
  const variantIds: string[] = [
    ...new Set<string>(lines.map((line: any) => line.variant_id)),
  ]

  const serializedByVariantId = new Map<string, boolean>()
  if (variantIds.length) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "metadata"],
      filters: { id: variantIds },
    })
    for (const variant of variants as any[]) {
      serializedByVariantId.set(variant.id, variant.metadata?.serialized === true)
    }
  }

  const linesWithSerialized = lines.map((line: any) => ({
    ...line,
    serialized: serializedByVariantId.get(line.variant_id) ?? false,
  }))

  res.json({
    purchase_order: { ...withSupplier, lines: linesWithSerialized },
  })
}
