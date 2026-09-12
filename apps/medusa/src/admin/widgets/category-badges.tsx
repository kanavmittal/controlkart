import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminProductCategory } from "@medusajs/framework/types"
import { StorefrontBadgesEditor } from "../components/storefront-badges-editor"
const CategoryBadgesWidget = ({ data }: DetailWidgetProps<AdminProductCategory>) => <StorefrontBadgesEditor key={data.id} id={data.id} kind="category" />
export const config = defineWidgetConfig({ zone: "product_category.details.after" })
export default CategoryBadgesWidget
