import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadBrands } from "../../../utils/load-brands"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ brands: await loadBrands(req.scope) })
}
