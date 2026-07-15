import { StatusBadge } from "@medusajs/ui"
import type { PurchaseOrderStatus } from "./types"

const STATUS_COLOR: Record<
  PurchaseOrderStatus,
  "grey" | "blue" | "orange" | "green" | "red"
> = {
  draft: "grey",
  open: "blue",
  partially_received: "orange",
  received: "green",
  cancelled: "red",
}

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  open: "Open",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
}

export function PurchaseOrderStatusBadge({
  status,
}: {
  status: PurchaseOrderStatus
}) {
  return (
    <StatusBadge color={STATUS_COLOR[status] ?? "grey"}>
      {STATUS_LABEL[status] ?? status}
    </StatusBadge>
  )
}
