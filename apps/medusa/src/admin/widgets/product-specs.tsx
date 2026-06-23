import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Select,
  Text,
  Badge,
  toast,
} from "@medusajs/ui"
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

/**
 * Technical specifications editor on the product detail page. Shows only the
 * spec fields defined by the product's category template (grouped), with an
 * "add another spec" escape hatch for one-off attributes from the catalog.
 */
const ProductSpecsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [rows, setRows] = useState<Row[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [catalog, setCatalog] = useState<CatalogAttribute[]>([])
  const [pendingAttr, setPendingAttr] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
        group: "Additional",
        unit: attr.unit,
        is_required: false,
        custom: true,
        inherited: false,
        source_category: null,
      },
    ])
    setPendingAttr("")
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
        <Heading level="h2">Technical Specifications</Heading>
        <Button size="small" onClick={save} isLoading={saving}>
          Save Specs
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-6">
          <Text size="small" className="text-ui-fg-subtle">
            No spec fields are defined for this product&rsquo;s category. Set up
            the category&rsquo;s spec template, or add an individual spec below.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-6 py-4">
          {grouped.map(([group, groupRows]) => (
            <div key={group} className="flex flex-col gap-2">
              <Text
                size="small"
                leading="compact"
                weight="plus"
                className="text-ui-fg-muted uppercase"
              >
                {group}
              </Text>
              {groupRows.map((row) => (
                <div
                  key={row.attribute_code}
                  className="grid grid-cols-[1fr_2fr_auto] items-center gap-3"
                >
                  <Label size="small" className="flex items-center gap-2">
                    {row.name}
                    {row.unit ? ` (${row.unit})` : ""}
                    {row.is_required ? (
                      <Badge size="2xsmall" color="orange">
                        Required
                      </Badge>
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
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => removeRow(row.attribute_code)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {availableToAdd.length > 0 ? (
        <div className="flex items-end gap-3 px-6 py-4">
          <div className="flex flex-col gap-1">
            <Label size="small" className="text-ui-fg-subtle">
              Add another spec
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
  zone: "product.details.after",
})

export default ProductSpecsWidget
