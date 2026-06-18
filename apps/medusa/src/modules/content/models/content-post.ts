import { model } from "@medusajs/framework/utils"

/** News, case studies, buying guides and application notes managed from Medusa Admin. */
const ContentPost = model.define("content_post", {
  id: model.id({ prefix: "cpost" }).primaryKey(),
  type: model
    .enum(["news", "case_study", "guide", "application_note"])
    .default("news"),
  title: model.text(),
  slug: model.text().unique(),
  excerpt: model.text().nullable(),
  /** markdown body rendered by the storefront */
  body: model.text(),
  cover_image: model.text().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  /** comma-separated product ids for internal linking */
  related_product_ids: model.text().nullable(),
  published_at: model.dateTime().nullable(),
})

export default ContentPost
