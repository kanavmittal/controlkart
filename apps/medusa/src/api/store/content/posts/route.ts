import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPosts } from "../../../../utils/strapi"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const type = typeof req.query.type === "string" ? req.query.type : undefined

  try {
    const { posts, count } = await listPosts({ type, limit, offset })
    res.json({ posts, count, limit, offset })
  } catch {
    // CMS unavailable — return empty rather than breaking the storefront's
    // /resources list and home "resources" section.
    res.json({ posts: [], count: 0, limit, offset })
  }
}
