import { ArrowLeft, Spinner } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { adminFetch } from "../../../lib/client"
import { LineComposer, type VariantOption } from "../components/line-composer"
import { PurchaseOrderStatusBadge } from "../components/po-status"
import type { PurchaseOrder } from "../components/types"

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString()
}

function lineBadge(
  po: PurchaseOrder,
  received: number,
  ordered: number
): { label: string; color: "red" | "orange" } | null {
  if (received > ordered) {
    return { label: "over", color: "orange" }
  }
  if (po.status === "received" && received < ordered) {
    return { label: "short", color: "red" }
  }
  return null
}

const PurchaseOrderDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [addingLine, setAddingLine] = useState(false)
  const [removingLineId, setRemovingLineId] = useState<string | null>(null)
  const [savingLineId, setSavingLineId] = useState<string | null>(null)
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({})

  const refresh = useCallback(() => {
    if (!id) return
    adminFetch<{ purchase_order: PurchaseOrder }>(
      `/admin/wms/purchase-orders/${id}`
    )
      .then((res) => setPo(res.purchase_order))
      .catch(() => toast.error("Failed to load purchase order"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isDraft = po?.status === "draft"

  const openForReceiving = async () => {
    if (!po) return
    setOpening(true)
    try {
      const res = await adminFetch<{ purchase_order: PurchaseOrder }>(
        `/admin/wms/purchase-orders/${po.id}`,
        { method: "POST", body: JSON.stringify({ status: "open" }) }
      )
      setPo(res.purchase_order)
      toast.success(`PO #${res.purchase_order.display_id} opened for receiving`)
    } catch {
      toast.error("Failed to open purchase order")
    } finally {
      setOpening(false)
    }
  }

  const addLine = async (variant: VariantOption, quantity: number) => {
    if (!po) return
    setAddingLine(true)
    try {
      const res = await adminFetch<{ purchase_order: PurchaseOrder }>(
        `/admin/wms/purchase-orders/${po.id}/lines`,
        {
          method: "POST",
          body: JSON.stringify({
            variant_id: variant.id,
            quantity_ordered: quantity,
          }),
        }
      )
      setPo(res.purchase_order)
      toast.success("Line added")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add line")
    } finally {
      setAddingLine(false)
    }
  }

  const removeLine = async (lineId: string) => {
    if (!po) return
    setRemovingLineId(lineId)
    try {
      await adminFetch(
        `/admin/wms/purchase-orders/${po.id}/lines/${lineId}`,
        { method: "DELETE" }
      )
      toast.success("Line removed")
      refresh()
    } catch {
      toast.error("Failed to remove line")
    } finally {
      setRemovingLineId(null)
    }
  }

  const saveLineQty = async (lineId: string) => {
    if (!po) return
    const raw = qtyDrafts[lineId]
    const qty = parseInt(raw ?? "", 10)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number")
      return
    }
    setSavingLineId(lineId)
    try {
      const res = await adminFetch<{ purchase_order: PurchaseOrder }>(
        `/admin/wms/purchase-orders/${po.id}/lines/${lineId}`,
        { method: "POST", body: JSON.stringify({ quantity_ordered: qty }) }
      )
      setPo(res.purchase_order)
      setQtyDrafts((d) => {
        const next = { ...d }
        delete next[lineId]
        return next
      })
      toast.success("Quantity updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update quantity")
    } finally {
      setSavingLineId(null)
    }
  }

  if (loading) {
    return (
      <Container className="flex items-center justify-center p-8">
        <Spinner className="animate-spin" />
      </Container>
    )
  }

  if (!po) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Purchase order not found.</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-x-2">
        <IconButton
          size="small"
          variant="transparent"
          onClick={() => navigate("/purchase-orders")}
        >
          <ArrowLeft />
        </IconButton>
        <Text size="small" className="text-ui-fg-subtle">
          Purchase Orders
        </Text>
      </div>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <Heading level="h1">PO #{po.display_id}</Heading>
            <PurchaseOrderStatusBadge status={po.status} />
          </div>
          {isDraft && (
            <Button size="small" onClick={openForReceiving} isLoading={opening}>
              Open for receiving
            </Button>
          )}
        </div>

        {isDraft && (
          <div className="bg-ui-bg-subtle mx-6 my-4 flex items-center justify-between gap-x-4 rounded-md p-4">
            <Text size="small" leading="compact">
              This PO is a draft — open it to start receiving.
            </Text>
            <Button size="small" onClick={openForReceiving} isLoading={opening}>
              Open
            </Button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Text size="small" weight="plus" leading="compact">
              Supplier
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {po.supplier?.name ?? "Unknown supplier"}
            </Text>
          </div>
          <div className="flex flex-col gap-y-1">
            <Text size="small" weight="plus" leading="compact">
              Expected date
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {formatDate(po.expected_date)}
            </Text>
          </div>
          <div className="flex flex-col gap-y-1">
            <Text size="small" weight="plus" leading="compact">
              Notes
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {po.notes ?? "—"}
            </Text>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Lines</Heading>
        </div>

        <div className="px-6 py-4">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>Ordered</Table.HeaderCell>
                <Table.HeaderCell>Received</Table.HeaderCell>
                <Table.HeaderCell />
                {isDraft && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(po.lines ?? []).map((line) => {
                const badge = lineBadge(
                  po,
                  line.quantity_received,
                  line.quantity_ordered
                )
                const draftQty = qtyDrafts[line.id]
                return (
                  <Table.Row key={line.id}>
                    <Table.Cell className="font-medium">{line.sku}</Table.Cell>
                    <Table.Cell className="text-ui-fg-subtle">
                      {line.title}
                    </Table.Cell>
                    <Table.Cell>
                      {isDraft ? (
                        <Input
                          type="number"
                          min={1}
                          value={draftQty ?? String(line.quantity_ordered)}
                          onChange={(e) =>
                            setQtyDrafts((d) => ({
                              ...d,
                              [line.id]: e.target.value,
                            }))
                          }
                          className="w-20"
                        />
                      ) : (
                        line.quantity_ordered
                      )}
                    </Table.Cell>
                    <Table.Cell>{line.quantity_received}</Table.Cell>
                    <Table.Cell>
                      {badge && (
                        <Badge size="2xsmall" color={badge.color}>
                          {badge.label}
                        </Badge>
                      )}
                    </Table.Cell>
                    {isDraft && (
                      <Table.Cell>
                        <div className="flex items-center justify-end gap-x-2">
                          {draftQty !== undefined &&
                            draftQty !== String(line.quantity_ordered) && (
                              <Button
                                size="small"
                                variant="secondary"
                                isLoading={savingLineId === line.id}
                                onClick={() => saveLineQty(line.id)}
                              >
                                Save
                              </Button>
                            )}
                          <Button
                            size="small"
                            variant="danger"
                            isLoading={removingLineId === line.id}
                            onClick={() => removeLine(line.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </Table.Cell>
                    )}
                  </Table.Row>
                )
              })}
              {!(po.lines ?? []).length && (
                <Table.Row>
                  <Table.Cell className="text-ui-fg-subtle">
                    No lines on this purchase order.
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>

          {isDraft ? (
            <div className="mt-4 flex flex-col gap-y-2">
              <Text size="small" weight="plus" leading="compact">
                Add a line
              </Text>
              <LineComposer
                onAdd={addLine}
                submitting={addingLine}
                disabledVariantIds={(po.lines ?? []).map((l) => l.variant_id)}
              />
            </div>
          ) : (
            <Text size="small" leading="compact" className="text-ui-fg-subtle mt-4">
              Line editing is only available while this purchase order is a
              draft.
            </Text>
          )}
        </div>
      </Container>
    </div>
  )
}

export default PurchaseOrderDetailPage
