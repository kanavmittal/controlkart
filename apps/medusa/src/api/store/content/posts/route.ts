import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const contentService: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const filters: Record<string, unknown> = {
    published_at: { $ne: null },
  }
  if (req.query.type) {
    filters.type = req.query.type
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  const [posts, count] = await contentService.listAndCountContentPosts(
    filters,
    {
      order: { published_at: "DESC" },
      take: limit,
      skip: offset,
      select: [
        "id",
        "type",
        "title",
        "slug",
        "excerpt",
        "cover_image",
        "published_at",
      ],
    }
  )
  res.json({ posts, count, limit, offset })
}
