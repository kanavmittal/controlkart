import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Button, Input, Table, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/client"

type SpecAttribute = {
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

/** Technical specifications editor on the product detail page. */
const ProductSpecsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [attributes, setAttributes] = useState<SpecAttribute[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      adminFetch<{ attributes: SpecAttribute[] }>("/admin/specs/attributes"),
      adminFetch<{ values: SpecValue[] }>(`/admin/products/${data.id}/specs`),
    ])
      .then(([attrRes, valRes]) => {
        setAttributes(attrRes.attributes)
        setValues(
          Object.fromEntries(
            valRes.values.map((v) => [v.attribute_code, v.value])
          )
        )
      })
      .catch(() => toast.error("Failed to load specifications"))
      .finally(() => setLoading(false))
  }, [data.id])

  const save = async () => {
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
      <div className="px-6 py-4">
        <Table>
          <Table.Body>
            {attributes.map((attr) => (
              <Table.Row key={attr.code}>
                <Table.Cell className="w-1/3 font-medium">
                  {attr.name}
                  {attr.unit ? ` (${attr.unit})` : ""}
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="small"
                    value={values[attr.code] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [attr.code]: e.target.value,
                      }))
                    }
                    placeholder="-"
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSpecsWidget
