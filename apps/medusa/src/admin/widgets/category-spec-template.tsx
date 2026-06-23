import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  DetailWidgetProps,
  AdminProductCategory,
} from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Button,
  Select,
  Checkbox,
  Label,
  Text,
  IconButton,
  Badge,
  toast,
} from "@medusajs/ui"
import { ArrowUpMini, ArrowDownMini, Trash } from "@medusajs/icons"
import { useEffect, useMemo, useState } from "react"
import { adminFetch } from "../lib/client"

type CatalogAttribute = {
  id: string
  name: string
  code: string
  group_code: string
  unit: string | null
}

type TemplateRow = {
  attribute_code: string
  name: string
  unit: string | null
  is_required: boolean
}

type InheritedRow = {
  attribute_code: string
  name: string
  unit: string | null
  group: string
  is_required: boolean
  source_category: string | null
}

/**
 * Lets merchants define which spec fields (and in what order) products in this
 * category display — this is what drives the per-category spec table instead of
 * a single global field list.
 */
const CategorySpecTemplateWidget = ({
  data,
}: DetailWidgetProps<AdminProductCategory>) => {
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [inherited, setInherited] = useState<InheritedRow[]>([])
  const [catalog, setCatalog] = useState<CatalogAttribute[]>([])
  const [pendingAttr, setPendingAttr] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      adminFetch<{
        templates: (TemplateRow & { id: string })[]
        inherited: InheritedRow[]
      }>(`/admin/categories/${data.id}/spec-template`),
      adminFetch<{ attributes: CatalogAttribute[] }>("/admin/specs/attributes"),
    ])
      .then(([tmplRes, catRes]) => {
        setRows(
          tmplRes.templates.map((t) => ({
            attribute_code: t.attribute_code,
            name: t.name,
            unit: t.unit,
            is_required: t.is_required,
          }))
        )
        setInherited(tmplRes.inherited ?? [])
        setCatalog(catRes.attributes)
      })
      .catch(() => toast.error("Failed to load spec template"))
      .finally(() => setLoading(false))
  }, [data.id])

  const availableToAdd = useMemo(() => {
    const used = new Set(rows.map((r) => r.attribute_code))
    return catalog.filter((a) => !used.has(a.code))
  }, [catalog, rows])

  const addRow = () => {
    const attr = catalog.find((a) => a.code === pendingAttr)
    if (!attr) {
      return
    }
    setRows((prev) => [
      ...prev,
      {
        attribute_code: attr.code,
        name: attr.name,
        unit: attr.unit,
        is_required: false,
      },
    ])
    setPendingAttr("")
  }

  const move = (index: number, delta: number) => {
    setRows((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) {
        return prev
      }
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const toggleRequired = (code: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.attribute_code === code ? { ...r, is_required: !r.is_required } : r
      )
    )
  }

  const removeRow = (code: string) => {
    setRows((prev) => prev.filter((r) => r.attribute_code !== code))
  }

  const save = async () => {
    setSaving(true)
    try {
      await adminFetch(`/admin/categories/${data.id}/spec-template`, {
        method: "POST",
        body: JSON.stringify({
          attributes: rows.map((r, i) => ({
            attribute_code: r.attribute_code,
            display_order: i,
            is_required: r.is_required,
          })),
        }),
      })
      toast.success("Spec template saved")
    } catch {
      toast.error("Failed to save spec template")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Spec Template</Heading>
        <Button size="small" onClick={save} isLoading={saving}>
          Save Template
        </Button>
      </div>

      {inherited.length > 0 ? (
        <div className="flex flex-col gap-2 px-6 py-4">
          <Text
            size="small"
            leading="compact"
            weight="plus"
            className="text-ui-fg-muted uppercase"
          >
            Inherited from parent categories
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            These cascade down from parent categories and apply automatically —
            no need to re-add them.
          </Text>
          <div className="flex flex-col gap-2 pt-1">
            {inherited.map((row) => (
              <div
                key={row.attribute_code}
                className="flex items-center justify-between gap-3 border-b border-ui-border-base pb-2 last:border-b-0"
              >
                <Text size="small" leading="compact">
                  {row.name}
                  {row.unit ? ` (${row.unit})` : ""}
                </Text>
                {row.source_category ? (
                  <Badge size="2xsmall" color="grey">
                    {row.source_category}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-6 py-4">
        {rows.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No spec fields yet. Add attributes below — products in this category
            will show exactly these fields, in this order.
          </Text>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <div
                key={row.attribute_code}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-ui-border-base pb-2 last:border-b-0"
              >
                <div className="flex flex-col">
                  <IconButton
                    size="2xsmall"
                    variant="transparent"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUpMini />
                  </IconButton>
                  <IconButton
                    size="2xsmall"
                    variant="transparent"
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDownMini />
                  </IconButton>
                </div>
                <Text size="small" leading="compact">
                  {row.name}
                  {row.unit ? ` (${row.unit})` : ""}
                </Text>
                <Label
                  size="small"
                  className="flex items-center gap-2 text-ui-fg-subtle"
                >
                  <Checkbox
                    checked={row.is_required}
                    onCheckedChange={() => toggleRequired(row.attribute_code)}
                  />
                  Required
                </Label>
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={() => removeRow(row.attribute_code)}
                >
                  <Trash />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>

      {availableToAdd.length > 0 ? (
        <div className="flex items-end gap-3 px-6 py-4">
          <div className="flex flex-col gap-1">
            <Label size="small" className="text-ui-fg-subtle">
              Add attribute
            </Label>
            <Select value={pendingAttr} onValueChange={setPendingAttr}>
              <Select.Trigger className="w-72">
                <Select.Value placeholder="Select an attribute…" />
              </Select.Trigger>
              <Select.Content>
                {availableToAdd.map((a) => (
                  <Select.Item key={a.code} value={a.code}>
                    {a.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <Button
            size="small"
            variant="secondary"
            onClick={addRow}
            disabled={!pendingAttr}
          >
            Add
          </Button>
        </div>
      ) : null}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategorySpecTemplateWidget
