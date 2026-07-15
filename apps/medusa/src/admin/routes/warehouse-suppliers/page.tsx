import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings } from "@medusajs/icons"
import {
  Badge,
  Button,
  Code,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Supplier = {
  id: string
  name: string
  barcode_template: string
  delimiter: string | null
  notes: string | null
  created_at: string
}

type ScanPreview =
  | { status: "idle" }
  | { status: "ok"; sku?: string; serial?: string }
  | { status: "error"; code: string; message: string }

type FormState = {
  name: string
  barcode_template: string
  delimiter: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: "",
  barcode_template: "",
  delimiter: "",
  notes: "",
}

/**
 * Same-origin fetch that surfaces our typed 400 bodies
 * ({ error: { code, message } }) instead of throwing a generic error.
 */
async function wmsFetch<T>(
  path: string,
  init?: RequestInit
): Promise<
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } }
> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? {
        code: "REQUEST_FAILED",
        message: data?.message ?? `Request failed with status ${res.status}`,
      },
    }
  }
  return { ok: true, data: data as T }
}

const WarehouseSuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [testRaw, setTestRaw] = useState("")
  const [preview, setPreview] = useState<ScanPreview>({ status: "idle" })

  const refresh = useCallback(() => {
    wmsFetch<{ suppliers: Supplier[] }>("/admin/wms/suppliers").then((res) => {
      if (res.ok) {
        setSuppliers(res.data.suppliers)
      } else {
        toast.error("Failed to load suppliers")
      }
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Live "test a scan": debounce a preview-scan call against the values
  // currently in the form (nothing is persisted server-side).
  useEffect(() => {
    if (!testRaw || !form.barcode_template) {
      setPreview({ status: "idle" })
      return
    }
    const timer = setTimeout(async () => {
      const res = await wmsFetch<{ sku?: string; serial?: string }>(
        "/admin/wms/suppliers/preview-scan",
        {
          method: "POST",
          body: JSON.stringify({
            template: form.barcode_template,
            delimiter: form.delimiter || null,
            raw: testRaw,
          }),
        }
      )
      if (res.ok) {
        setPreview({ status: "ok", ...res.data })
      } else {
        setPreview({ status: "error", ...res.error })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [testRaw, form.barcode_template, form.delimiter])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setTestRaw("")
    setPreview({ status: "idle" })
    setDrawerOpen(true)
  }

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id)
    setForm({
      name: supplier.name,
      barcode_template: supplier.barcode_template,
      delimiter: supplier.delimiter ?? "",
      notes: supplier.notes ?? "",
    })
    setTestRaw("")
    setPreview({ status: "idle" })
    setDrawerOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.barcode_template.trim()) {
      toast.error("Name and barcode template are required")
      return
    }
    setSaving(true)
    const body = JSON.stringify({
      name: form.name.trim(),
      barcode_template: form.barcode_template.trim(),
      delimiter: form.delimiter || null,
      notes: form.notes.trim() || null,
    })
    const res = editingId
      ? await wmsFetch(`/admin/wms/suppliers/${editingId}`, {
          method: "POST",
          body,
        })
      : await wmsFetch("/admin/wms/suppliers", { method: "POST", body })
    setSaving(false)

    if (!res.ok) {
      toast.error(`${res.error.code}: ${res.error.message}`)
      return
    }
    toast.success(editingId ? "Supplier updated" : "Supplier created")
    setDrawerOpen(false)
    refresh()
  }

  const remove = async (supplier: Supplier) => {
    const res = await wmsFetch(`/admin/wms/suppliers/${supplier.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      toast.error("Failed to delete supplier")
      return
    }
    toast.success(`Deleted "${supplier.name}"`)
    refresh()
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Warehouse Suppliers</Heading>
        <Button size="small" onClick={openCreate}>
          Add supplier
        </Button>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Barcode template</Table.HeaderCell>
              <Table.HeaderCell>Delimiter</Table.HeaderCell>
              <Table.HeaderCell>Notes</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {suppliers.map((supplier) => (
              <Table.Row key={supplier.id}>
                <Table.Cell className="font-medium">{supplier.name}</Table.Cell>
                <Table.Cell>
                  <Code>{supplier.barcode_template}</Code>
                </Table.Cell>
                <Table.Cell>
                  {supplier.delimiter ? (
                    <Code>{supplier.delimiter}</Code>
                  ) : (
                    <Text size="small" className="text-ui-fg-subtle">
                      none
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {supplier.notes ?? "-"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-x-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => openEdit(supplier)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => remove(supplier)}
                    >
                      Delete
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {!suppliers.length && (
              <Table.Row>
                <Table.Cell className="text-ui-fg-subtle">
                  No suppliers yet. Add one to configure barcode parsing.
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {editingId ? "Edit supplier" : "Add supplier"}
            </Drawer.Title>
          </Drawer.Header>

          <Drawer.Body className="flex-1 overflow-auto">
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Acme Components"
                />
              </div>

              <div className="flex flex-col gap-y-2">
                <Label>Barcode template *</Label>
                <Input
                  value={form.barcode_template}
                  onChange={(e) =>
                    setForm({ ...form, barcode_template: e.target.value })
                  }
                  placeholder="e.g. {sku}|{serial}"
                />
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  Use {"{sku}"} and {"{serial}"} placeholders (each at most
                  once), separated by the delimiter.
                </Text>
              </div>

              <div className="flex flex-col gap-y-2">
                <Label>Delimiter</Label>
                <Input
                  value={form.delimiter}
                  onChange={(e) =>
                    setForm({ ...form, delimiter: e.target.value })
                  }
                  placeholder="e.g. |"
                />
              </div>

              <div className="flex flex-col gap-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Internal notes about this supplier's labels"
                />
              </div>

              <div className="bg-ui-bg-subtle flex flex-col gap-y-2 rounded-md p-4">
                <Label>Test a scan</Label>
                <Input
                  value={testRaw}
                  onChange={(e) => setTestRaw(e.target.value)}
                  placeholder="Paste or scan a barcode value"
                />
                {preview.status === "ok" && (
                  <div className="flex items-center gap-x-2">
                    <Badge size="2xsmall" color="green">
                      match
                    </Badge>
                    <Text size="small" leading="compact">
                      sku: <Code>{preview.sku ?? "—"}</Code> · serial:{" "}
                      <Code>{preview.serial ?? "—"}</Code>
                    </Text>
                  </div>
                )}
                {preview.status === "error" && (
                  <div className="flex items-center gap-x-2">
                    <Badge size="2xsmall" color="red">
                      {preview.code}
                    </Badge>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-error"
                    >
                      {preview.message}
                    </Text>
                  </div>
                )}
                {preview.status === "idle" && (
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    Enter a template above and a sample scan to see the decoded
                    result.
                  </Text>
                )}
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
              <Button size="small" onClick={save} isLoading={saving}>
                Save
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Warehouse Suppliers",
  icon: Buildings,
})

export default WarehouseSuppliersPage
