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

export type SpecFacetDTO = {
  attribute_code: string
  name: string
  unit: string | null
  group: string
  values: { value: string; count: number }[]
}

export type SpecSortOption = {
  attribute_code: string
  name: string
  unit: string | null
}

export type SpecFacetsResponse = {
  facets: SpecFacetDTO[]
  /**
   * ids of products in the category (and its descendants) matching the
   * selected filters, ordered by the requested spec sort when one is given.
   */
  product_ids: string[]
  /** comparable attributes in the category's resolved template (sort options) */
  sortable: SpecSortOption[]
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
