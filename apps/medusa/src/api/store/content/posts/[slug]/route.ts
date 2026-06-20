import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const contentService: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const [post] = await contentService.listContentPosts({
    slug: req.params.slug,
    published_at: { $ne: null },
  })

  if (!post) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Post not found")
  }
  res.json({ post })
}
