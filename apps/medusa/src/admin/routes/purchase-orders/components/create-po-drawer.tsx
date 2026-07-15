import {
  Button,
  Drawer,
  Input,
  Label,
  Select,
  Table,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../../../lib/client"
import { LineComposer, type VariantOption } from "./line-composer"
import type { PurchaseOrder, Supplier } from "./types"

type LineDraft = {
  variant_id: string
  sku: string
  title: string
  quantity_ordered: number
}

type FormState = {
  supplier_id: string
  expected_date: string
  notes: string
  lines: LineDraft[]
}

const EMPTY_FORM: FormState = {
  supplier_id: "",
  expected_date: "",
  notes: "",
  lines: [],
}

export function CreatePurchaseOrderDrawer({
  open,
  onOpenChange,
  suppliers,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  suppliers: Supplier[]
  onCreated: () => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [savingDraft, setSavingDraft] = useState(false)
  const [savingOpen, setSavingOpen] = useState(false)
  const saving = savingDraft || savingOpen

  const reset = () => setForm(EMPTY_FORM)

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const addLine = (variant: VariantOption, quantity: number) => {
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          variant_id: variant.id,
          sku: variant.sku,
          title: variant.title,
          quantity_ordered: quantity,
        },
      ],
    }))
  }

  const removeLine = (variantId: string) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.filter((l) => l.variant_id !== variantId),
    }))
  }

  const updateLineQty = (variantId: string, quantity: number) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) =>
        l.variant_id === variantId ? { ...l, quantity_ordered: quantity } : l
      ),
    }))
  }

  const submit = async (openAfter: boolean) => {
    if (!form.supplier_id) {
      toast.error("Select a supplier")
      return
    }
    if (openAfter && !form.lines.length) {
      toast.error("Add at least one line before opening for receiving")
      return
    }

    const setSaving = openAfter ? setSavingOpen : setSavingDraft
    setSaving(true)
    try {
      const created = await adminFetch<{ purchase_order: PurchaseOrder }>(
        "/admin/wms/purchase-orders",
        {
          method: "POST",
          body: JSON.stringify({
            supplier_id: form.supplier_id,
            expected_date: form.expected_date || null,
            notes: form.notes.trim() || null,
            lines: form.lines.map((l) => ({
              variant_id: l.variant_id,
              quantity_ordered: l.quantity_ordered,
            })),
          }),
        }
      )

      if (openAfter) {
        await adminFetch(
          `/admin/wms/purchase-orders/${created.purchase_order.id}`,
          {
            method: "POST",
            body: JSON.stringify({ status: "open" }),
          }
        )
      }

      toast.success(
        openAfter
          ? "Purchase order created and opened for receiving"
          : "Purchase order saved as draft"
      )
      reset()
      onOpenChange(false)
      onCreated()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create purchase order"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Create purchase order</Drawer.Title>
        </Drawer.Header>

        <Drawer.Body className="flex-1 overflow-auto">
          <div className="flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-2">
              <Label>Supplier *</Label>
              <Select
                value={form.supplier_id}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, supplier_id: value }))
                }
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select a supplier" />
                </Select.Trigger>
                <Select.Content>
                  {suppliers.map((s) => (
                    <Select.Item key={s.id} value={s.id}>
                      {s.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <div className="flex flex-col gap-y-2">
              <Label>Expected date</Label>
              <Input
                type="date"
                value={form.expected_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expected_date: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Internal notes about this order"
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <Label>Lines</Label>

              {!!form.lines.length && (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>SKU</Table.HeaderCell>
                      <Table.HeaderCell>Title</Table.HeaderCell>
                      <Table.HeaderCell>Qty</Table.HeaderCell>
                      <Table.HeaderCell />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {form.lines.map((line) => (
                      <Table.Row key={line.variant_id}>
                        <Table.Cell className="font-medium">
                          {line.sku}
                        </Table.Cell>
                        <Table.Cell className="text-ui-fg-subtle">
                          {line.title}
                        </Table.Cell>
                        <Table.Cell>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity_ordered}
                            onChange={(e) =>
                              updateLineQty(
                                line.variant_id,
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-20"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => removeLine(line.variant_id)}
                          >
                            Remove
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}

              <LineComposer
                onAdd={addLine}
                disabledVariantIds={form.lines.map((l) => l.variant_id)}
              />
            </div>
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Drawer.Close asChild>
              <Button size="small" variant="secondary" disabled={saving}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              variant="secondary"
              onClick={() => submit(false)}
              isLoading={savingDraft}
              disabled={saving}
            >
              Save as draft
            </Button>
            <Button
              size="small"
              onClick={() => submit(true)}
              isLoading={savingOpen}
              disabled={saving}
            >
              Create & open for receiving
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
