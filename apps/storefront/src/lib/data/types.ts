export type SpecValueDTO = {
  id: string
  attribute: string
  attribute_code: string
  group: string
  group_order: number
  value: string
  unit: string | null
  display_order: number
  is_filterable: boolean
  is_comparable: boolean
}

export type ProductDocumentDTO = {
  id: string
  title: string
  type: "datasheet" | "manual" | "cad" | "certificate" | "other"
  file_url: string
  file_size: number | null
}

export type ContentPostDTO = {
  id: string
  type: "news" | "case_study" | "guide" | "application_note"
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_image: string | null
  seo_title: string | null
  seo_description: string | null
  related_product_ids: string | null
  published_at: string | null
}
