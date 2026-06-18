import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUOTES_MODULE } from "../../../../modules/quotes"
import type QuotesModuleService from "../../../../modules/quotes/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const quotesService: QuotesModuleService = req.scope.resolve(QUOTES_MODULE)
  const quote = await quotesService.retrieveQuote(req.params.id, {
    relations: ["items"],
  })
  res.json({ quote })
}

type UpdateQuoteBody = {
  status?: string
  admin_notes?: string
  quoted_total?: number
  valid_until?: string
  items?: { id: string; quoted_unit_price: number }[]
}

export const POST = async (
  req: MedusaRequest<UpdateQuoteBody>,
  res: MedusaResponse
) => {
  const quotesService: QuotesModuleService = req.scope.resolve(QUOTES_MODULE)
  const { items, ...update } = req.body

  if (Object.keys(update).length) {
    await quotesService.updateQuotes({
      id: req.params.id,
      ...update,
      valid_until: update.valid_until ? new Date(update.valid_until) : undefined,
    } as any)
  }

  if (items?.length) {
    await quotesService.updateQuoteItems(
      items.map((i) => ({ id: i.id, quoted_unit_price: i.quoted_unit_price }))
    )
  }

  const quote = await quotesService.retrieveQuote(req.params.id, {
    relations: ["items"],
  })
  res.json({ quote })
}
