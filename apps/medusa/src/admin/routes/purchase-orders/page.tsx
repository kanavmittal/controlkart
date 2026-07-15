import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Receipt } from "@medusajs/icons"
import { Button, Container, Heading, Table, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState, type MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { adminFetch } from "../../lib/client"
import { CreatePurchaseOrderDrawer } from "./components/create-po-drawer"
import { PurchaseOrderStatusBadge } from "./components/po-status"
import type { PurchaseOrder, Supplier } from "./components/types"

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString()
}

function lineTotals(po: PurchaseOrder): { received: number; ordered: number } {
  return (po.lines ?? []).reduce(
    (acc, line) => ({
      received: acc.received + line.quantity_received,
      ordered: acc.ordered + line.quantity_ordered,
    }),
    { received: 0, ordered: 0 }
  )
}

const PurchaseOrdersPage = () => {
  const navigate = useNavigate()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    adminFetch<{ purchase_orders: PurchaseOrder[] }>(
      "/admin/wms/purchase-orders?limit=200"
    )
      .then((res) => setPurchaseOrders(res.purchase_orders))
      .catch(() => toast.error("Failed to load purchase orders"))
      .finally(() => setLoading(false))
  }, [])

  const refreshSuppliers = useCallback(() => {
    adminFetch<{ suppliers: Supplier[] }>("/admin/wms/suppliers")
      .then((res) => setSuppliers(res.suppliers))
      .catch(() => toast.error("Failed to load suppliers"))
  }, [])

  useEffect(() => {
    refresh()
    refreshSuppliers()
  }, [refresh, refreshSuppliers])

  const openForReceiving = async (po: PurchaseOrder, e: MouseEvent) => {
    e.stopPropagation()
    setOpeningId(po.id)
    try {
      await adminFetch(`/admin/wms/purchase-orders/${po.id}`, {
        method: "POST",
        body: JSON.stringify({ status: "open" }),
      })
      toast.success(`PO #${po.display_id} opened for receiving`)
      refresh()
    } catch {
      toast.error("Failed to open purchase order")
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Purchase Orders</Heading>
        <Button size="small" onClick={() => setDrawerOpen(true)}>
          Create purchase order
        </Button>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>PO</Table.HeaderCell>
              <Table.HeaderCell>Supplier</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Expected date</Table.HeaderCell>
              <Table.HeaderCell>Received / Ordered</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {purchaseOrders.map((po) => {
              const totals = lineTotals(po)
              return (
                <Table.Row
                  key={po.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}
                >
                  <Table.Cell className="font-medium">
                    #{po.display_id}
                  </Table.Cell>
                  <Table.Cell>
                    {po.supplier?.name ?? (
                      <Text size="small" className="text-ui-fg-subtle">
                        Unknown supplier
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <PurchaseOrderStatusBadge status={po.status} />
                  </Table.Cell>
                  <Table.Cell>{formatDate(po.expected_date)}</Table.Cell>
                  <Table.Cell>
                    {totals.received} / {totals.ordered}
                  </Table.Cell>
                  <Table.Cell>
                    {po.status === "draft" && (
                      <Button
                        size="small"
                        variant="secondary"
                        isLoading={openingId === po.id}
                        onClick={(e) => openForReceiving(po, e)}
                      >
                        Open
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              )
            })}
            {!loading && !purchaseOrders.length && (
              <Table.Row>
                <Table.Cell className="text-ui-fg-subtle">
                  No purchase orders yet. Create one to start ordering stock.
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      <CreatePurchaseOrderDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        suppliers={suppliers}
        onCreated={refresh}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Purchase Orders",
  icon: Receipt,
})

export default PurchaseOrdersPage
