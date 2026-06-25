import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Button, Textarea, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../lib/client"

/**
 * Short product note shown under the price box on the storefront (e.g. "v2 of
 * this controller ships from August"). Stored in `product.metadata.footnote`.
 */
const ProductFootnoteWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [value, setValue] = useState<string>(
    (data.metadata?.footnote as string) ?? ""
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await adminFetch(`/admin/products/${data.id}/footnote`, {
        method: "POST",
        body: JSON.stringify({ footnote: value }),
      })
      toast.success("Footnote saved")
    } catch {
      toast.error("Failed to save footnote")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Footnote</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Shown under the price box on the storefront. Leave empty to hide.
          </Text>
        </div>
        <Button size="small" onClick={save} isLoading={saving}>
          Save
        </Button>
      </div>
      <div className="px-6 py-4">
        <Textarea
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Note: v2 of this controller ships from August."
        />
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductFootnoteWidget
