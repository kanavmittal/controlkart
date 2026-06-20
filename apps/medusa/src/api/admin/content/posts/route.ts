import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const contentService: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const filters: Record<string, unknown> = {}
  if (req.query.type) {
    filters.type = req.query.type
  }

  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Number(req.query.offset) || 0

  const [posts, count] = await contentService.listAndCountContentPosts(
    filters,
    { order: { created_at: "DESC" }, take: limit, skip: offset }
  )
  res.json({ posts, count, limit, offset })
}

type CreatePostBody = {
  type?: "news" | "case_study" | "guide" | "application_note"
  title: string
  slug: string
  excerpt?: string
  body: string
  cover_image?: string
  seo_title?: string
  seo_description?: string
  related_product_ids?: string
  published_at?: string | null
}

export const POST = async (
  req: MedusaRequest<CreatePostBody>,
  res: MedusaResponse
) => {
  const contentService: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const post = await contentService.createContentPosts({
    ...req.body,
    published_at: req.body.published_at ? new Date(req.body.published_at) : null,
  })
  res.status(201).json({ post })
}
