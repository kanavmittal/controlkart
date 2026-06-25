import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Text,
  Badge,
  IconButton,
  Checkbox,
  FocusModal,
  toast,
} from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useEffect, useMemo, useState } from "react"
import { adminFetch } from "../lib/client"

type TemplateAttribute = {
  attribute_code: string
  name: string
  group_code: string
  group: string
  unit: string | null
  is_required: boolean
  inherited: boolean
  source_category: string | null
}

type CatalogAttribute = {
  id: string
  name: string
  code: string
  group_code: string
  unit: string | null
}

type SpecValue = {
  id: string
  attribute_code: string
  value: string
}

/** One editable row: an attribute (from the category template or added ad-hoc) plus its value. */
type Row = {
  attribute_code: string
  name: string
  group: string
  unit: string | null
  is_required: boolean
  /** false when the field comes from the category template, true for one-off additions */
  custom: boolean
  /** true when the spec is inherited only from an ancestor category */
  inherited: boolean
  source_category: string | null
}

/** Shared column template so every row reads like a native Medusa detail sheet. */
const ROW =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_40px] items-center gap-3 px-6"

/**
 * Technical specifications editor on the product detail page. Shows the spec
 * fields defined by the product's category template (grouped), with an "Add
 * spec" escape hatch for one-off attributes from the catalog.
 */
const ProductSpecsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [rows, setRows] = useState<Row[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [catalog, setCatalog] = useState<CatalogAttribute[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      adminFetch<{ attributes: TemplateAttribute[] }>(
        `/admin/products/${data.id}/spec-template`
      ),
      adminFetch<{ values: SpecValue[] }>(`/admin/products/${data.id}/specs`),
      adminFetch<{ attributes: CatalogAttribute[] }>("/admin/specs/attributes"),
    ])
      .then(([tmplRes, valRes, catRes]) => {
        const valueMap = Object.fromEntries(
          valRes.values.map((v) => [v.attribute_code, v.value])
        )
        const templateRows: Row[] = tmplRes.attributes.map((a) => ({
          attribute_code: a.attribute_code,
          name: a.name,
          group: a.group,
          unit: a.unit,
          is_required: a.is_required,
          custom: false,
          inherited: a.inherited,
          source_category: a.source_category,
        }))

        // Surface any saved value whose attribute isn't in the template as a
        // custom row so it stays editable (and doesn't silently vanish).
        const inTemplate = new Set(templateRows.map((r) => r.attribute_code))
        const catByCode = new Map(catRes.attributes.map((a) => [a.code, a]))
        const extraRows: Row[] = valRes.values
          .filter((v) => !inTemplate.has(v.attribute_code))
          .map((v) => {
            const attr = catByCode.get(v.attribute_code)
            return {
              attribute_code: v.attribute_code,
              name: attr?.name ?? v.attribute_code,
              group: "Additional",
              unit: attr?.unit ?? null,
              is_required: false,
              custom: true,
              inherited: false,
              source_category: null,
            }
          })

        setRows([...templateRows, ...extraRows])
        setValues(valueMap)
        setCatalog(catRes.attributes)
      })
      .catch(() => toast.error("Failed to load specifications"))
      .finally(() => setLoading(false))
  }, [data.id])

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const row of rows) {
      const list = map.get(row.group) ?? []
      list.push(row)
      map.set(row.group, list)
    }
    return [...map.entries()]
  }, [rows])

  const availableToAdd = useMemo(() => {
    const used = new Set(rows.map((r) => r.attribute_code))
    return catalog.filter((a) => !used.has(a.code))
  }, [catalog, rows])

  const openAdd = () => {
    setSelected(new Set())
    setAddOpen(true)
  }

  const toggleSelected = (code: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(code)
      } else {
        next.delete(code)
      }
      return next
    })

  const confirmAdd = () => {
    const toAdd = catalog.filter((a) => selected.has(a.code))
    setRows((prev) => [
      ...prev,
      ...toAdd.map((a) => ({
        attribute_code: a.code,
        name: a.name,
        group: "Additional",
        unit: a.unit,
        is_required: false,
        custom: true,
        inherited: false,
        source_category: null,
      })),
    ])
    setSelected(new Set())
    setAddOpen(false)
  }

  const removeRow = (code: string) => {
    setRows((prev) => prev.filter((r) => r.attribute_code !== code))
    setValues((prev) => {
      const next = { ...prev }
      delete next[code]
      return next
    })
  }

  const save = async () => {
    const missingRequired = rows.filter(
      (r) => r.is_required && !(values[r.attribute_code] ?? "").trim()
    )
    if (missingRequired.length) {
      toast.error(
        `Missing required: ${missingRequired.map((r) => r.name).join(", ")}`
      )
      return
    }

    setSaving(true)
    try {
      await adminFetch(`/admin/products/${data.id}/specs`, {
        method: "POST",
        body: JSON.stringify({
          values: Object.entries(values)
            .filter(([, value]) => value.trim() !== "")
            .map(([attribute_code, value]) => ({ attribute_code, value })),
        }),
      })
      toast.success("Specifications saved")
    } catch {
      toast.error("Failed to save specifications")
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
        <div>
          <Heading level="h2">Technical Specifications</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Values for this product&rsquo;s category spec fields. Inherited
            fields cascade automatically.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={openAdd}
            disabled={availableToAdd.length === 0}
          >
            Add spec
          </Button>
          <Button size="small" onClick={save} isLoading={saving}>
            Save Specs
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-6">
          <Text size="small" className="text-ui-fg-subtle">
            No spec fields are defined for this product&rsquo;s category. Set up
            the category&rsquo;s spec template, or use &ldquo;Add spec&rdquo;.
          </Text>
        </div>
      ) : (
        grouped.map(([group, groupRows]) => (
          <div key={group} className="py-4">
            <Text
              size="xsmall"
              leading="compact"
              weight="plus"
              className="px-6 pb-2 text-ui-fg-muted uppercase"
            >
              {group}
            </Text>
            {groupRows.map((row) => (
              <div
                key={row.attribute_code}
                className={`${ROW} border-b border-ui-border-base py-2.5 last:border-b-0 ${
                  row.inherited ? "opacity-70" : ""
                }`}
              >
                <Label
                  size="small"
                  className="flex items-center gap-1.5 text-ui-fg-subtle"
                >
                  <span className="text-ui-fg-base">
                    {row.name}
                    {row.unit ? ` (${row.unit})` : ""}
                  </span>
                  {row.is_required ? (
                    <span className="text-ui-fg-error" aria-hidden>
                      *
                    </span>
                  ) : null}
                  {row.inherited ? (
                    <Badge size="2xsmall" color="grey">
                      {row.source_category
                        ? `Inherited · ${row.source_category}`
                        : "Inherited"}
                    </Badge>
                  ) : null}
                </Label>
                <Input
                  size="small"
                  value={values[row.attribute_code] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [row.attribute_code]: e.target.value,
                    }))
                  }
                  placeholder="-"
                />
                {row.custom ? (
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => removeRow(row.attribute_code)}
                  >
                    <Trash />
                  </IconButton>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {/* Add spec modal — multi-select from the catalog */}
      <FocusModal open={addOpen} onOpenChange={setAddOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button
              size="small"
              onClick={confirmAdd}
              disabled={selected.size === 0}
            >
              Add {selected.size || ""} spec{selected.size === 1 ? "" : "s"}
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center py-8">
            <div className="flex w-full max-w-lg flex-col gap-3">
              <Heading level="h2">Add spec</Heading>
              {availableToAdd.length === 0 ? (
                <Text size="small" className="text-ui-fg-subtle">
                  Every catalog attribute is already in this spec sheet.
                </Text>
              ) : (
                availableToAdd.map((a) => (
                  <Label
                    key={a.code}
                    size="small"
                    className="flex items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 hover:bg-ui-bg-base-hover"
                  >
                    <Checkbox
                      checked={selected.has(a.code)}
                      onCheckedChange={(v) => toggleSelected(a.code, !!v)}
                    />
                    <span className="text-ui-fg-base">
                      {a.name}
                      {a.unit ? (
                        <span className="text-ui-fg-subtle"> ({a.unit})</span>
                      ) : null}
                    </span>
                  </Label>
                ))
              )}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSpecsWidget
