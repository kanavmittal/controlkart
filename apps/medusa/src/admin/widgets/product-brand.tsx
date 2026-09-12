import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/client"
function ProductBrandEditor({ data }: DetailWidgetProps<AdminProduct>) {
  const [brand, setBrand] = useState(typeof data.metadata?.brand === "string" ? data.metadata.brand : "")
  const [options, setOptions] = useState<{ name: string }[]>([])
  const [saving, setSaving] = useState(false)
  useEffect(() => { adminFetch<{ brands: { name: string }[] }>("/admin/brands").then((r) => setOptions(r.brands)).catch(() => {}) }, [])
  const save = async () => {
    setSaving(true)
    try {
      const response = await adminFetch<{ brand: string }>(`/admin/products/${data.id}/brand`, { method: "POST", body: JSON.stringify({ brand }) })
      setBrand(response.brand); toast.success("Product brand saved")
    } catch { toast.error("Could not save product brand") }
    finally { setSaving(false) }
  }
  return <Container className="space-y-3">
    <div className="flex items-center justify-between"><Heading level="h2">Brand</Heading><Button size="small" isLoading={saving} onClick={save}>Save brand</Button></div>
    <Label htmlFor={`${data.id}-brand`}>Manufacturer</Label>
    <Input id={`${data.id}-brand`} list={`${data.id}-brands`} disabled={saving} value={brand} maxLength={80} placeholder="Select or enter a brand" onChange={(e) => setBrand(e.target.value)} />
    <datalist id={`${data.id}-brands`}>{options.map((option) => <option key={option.name} value={option.name} />)}</datalist>
    <Text size="small">Choose an existing brand or enter a new one. Manage its logo and cover in Brands. Leave empty to remove the brand.</Text>
  </Container>
}
const ProductBrandWidget = (props: DetailWidgetProps<AdminProduct>) => <ProductBrandEditor key={props.data.id} {...props} />
export const config = defineWidgetConfig({ zone: "product.details.after" })
export default ProductBrandWidget
