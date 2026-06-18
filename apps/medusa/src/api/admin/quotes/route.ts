import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUOTES_MODULE } from "../../../modules/quotes"
import type QuotesModuleService from "../../../modules/quotes/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const quotesService: QuotesModuleService = req.scope.resolve(QUOTES_MODULE)
  const filters: Record<string, unknown> = {}
  if (req.query.status) {
    filters.status = req.query.status
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  const [quotes, count] = await quotesService.listAndCountQuotes(filters, {
    relations: ["items"],
    order: { created_at: "DESC" },
    take: limit,
    skip: offset,
  })
  res.json({ quotes, count, limit, offset })
}
