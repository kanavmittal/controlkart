import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getPostBySlug } from "../../../../../utils/strapi"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const post = await getPostBySlug(req.params.slug)

  if (!post) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Post not found")
  }
  res.json({ post })
}
