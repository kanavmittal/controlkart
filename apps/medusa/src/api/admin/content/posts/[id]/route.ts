import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const contentService: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const post = await contentService.retrieveContentPost(req.params.id)
  res.json({ post })
}

export const POST = async (
  req: MedusaRequest<Record<string, unknown>>,
  res: MedusaResponse
) => {
  const contentService: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const update: Record<string, unknown> = { ...req.body, id: req.params.id }
  if (typeof update.published_at === "string") {
    update.published_at = new Date(update.published_at as string)
  }
  const post = await contentService.updateContentPosts(update as any)
  res.json({ post })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const contentService: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  await contentService.deleteContentPosts(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
