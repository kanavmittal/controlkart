export type PurchaseOrderStatus =
  | "draft"
  | "open"
  | "partially_received"
  | "received"
  | "cancelled"

export type Supplier = {
  id: string
  name: string
  barcode_template: string
  delimiter: string | null
  notes: string | null
}

export type PurchaseOrderLine = {
  id: string
  variant_id: string
  sku: string
  title: string
  quantity_ordered: number
  quantity_received: number
}

export type PurchaseOrder = {
  id: string
  display_id: number
  supplier_id: string
  supplier: Supplier | null
  status: PurchaseOrderStatus
  expected_date: string | null
  notes: string | null
  lines: PurchaseOrderLine[]
  created_at: string
}
