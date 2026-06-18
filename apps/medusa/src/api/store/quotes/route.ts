import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createQuoteRequestWorkflow } from "../../../workflows/create-quote-request"
import { QUOTES_MODULE } from "../../../modules/quotes"
import type QuotesModuleService from "../../../modules/quotes/service"

type QuoteBody = {
  company_name: string
  gstin?: string
  contact_name: string
  email: string
  phone: string
  pincode: string
  expected_date?: string
  notes?: string
  items: { sku: string; quantity: number }[]
}

export const POST = async (
  req: AuthenticatedMedusaRequest<QuoteBody>,
  res: MedusaResponse
) => {
  const { result } = await createQuoteRequestWorkflow(req.scope).run({
    input: {
      ...req.body,
      customer_id: req.auth_context?.actor_id ?? null,
    },
  })
  res.status(201).json({ quote: result })
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const quotesService: QuotesModuleService = req.scope.resolve(QUOTES_MODULE)
  const quotes = await quotesService.listQuotes(
    { customer_id: req.auth_context.actor_id },
    { relations: ["items"], order: { created_at: "DESC" } }
  )
  res.json({ quotes })
}
