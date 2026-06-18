/** Shared contracts between Medusa backend custom modules and the storefront. */

export type SpecValueDTO = {
  id: string
  attribute: string
  group: string
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

export type QuoteStatus =
  | "requested"
  | "under_review"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted"

export type QuoteRequestPayload = {
  company_name: string
  gstin?: string
  contact_name: string
  email: string
  phone: string
  pincode: string
  expected_date?: string
  notes?: string
  items: { sku: string; quantity: number }[]
}

export type ContentPostType = "news" | "case_study" | "guide" | "application_note"

export type ContentPostDTO = {
  id: string
  type: ContentPostType
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_image: string | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
}
