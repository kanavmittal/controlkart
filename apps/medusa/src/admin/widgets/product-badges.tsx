import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { StorefrontBadgesEditor } from "../components/storefront-badges-editor"
const ProductBadgesWidget = ({ data }: DetailWidgetProps<AdminProduct>) => <StorefrontBadgesEditor key={data.id} id={data.id} kind="product" />
export const config = defineWidgetConfig({ zone: "product.details.after" })
export default ProductBadgesWidget
