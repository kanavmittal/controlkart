import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { QUOTES_MODULE } from "../modules/quotes"
import type QuotesModuleService from "../modules/quotes/service"

type QuoteRequestInput = {
  customer_id?: string | null
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

/** Resolve requested SKUs to variants so the admin sees real catalog lines. */
const resolveQuoteItemsStep = createStep(
  "resolve-quote-items",
  async (input: QuoteRequestInput, { container }) => {
    if (!input.items?.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A quote request needs at least one item"
      )
    }

    const query = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.QUERY
    )
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "product.title"],
      filters: { sku: input.items.map((i) => i.sku) },
    })
    const bySku = new Map<string, any>(
      (variants as any[]).map((v) => [v.sku, v])
    )

    return new StepResponse(
      input.items.map((item) => {
        const variant = bySku.get(item.sku)
        return {
          sku: item.sku,
          quantity: item.quantity,
          variant_id: variant?.id ?? null,
          product_title: variant?.product?.title ?? null,
        }
      })
    )
  }
)

const createQuoteStep = createStep(
  "create-quote",
  async (
    input: {
      request: QuoteRequestInput
      items: {
        sku: string
        quantity: number
        variant_id: string | null
        product_title: string | null
      }[]
    },
    { container }
  ) => {
    const quotesService: QuotesModuleService = container.resolve(QUOTES_MODULE)
    const { items, request } = input

    const quote = await quotesService.createQuotes({
      customer_id: request.customer_id ?? null,
      company_name: request.company_name,
      gstin: request.gstin ?? null,
      contact_name: request.contact_name,
      email: request.email,
      phone: request.phone,
      pincode: request.pincode,
      expected_date: request.expected_date ? new Date(request.expected_date) : null,
      notes: request.notes ?? null,
    })

    await quotesService.createQuoteItems(
      items.map((i) => ({
        quote_id: quote.id,
        sku: i.sku,
        quantity: i.quantity,
        variant_id: i.variant_id,
        product_title: i.product_title,
      }))
    )

    return new StepResponse(quote, quote.id)
  },
  async (quoteId, { container }) => {
    if (!quoteId) return
    const quotesService: QuotesModuleService = container.resolve(QUOTES_MODULE)
    await quotesService.deleteQuotes(quoteId)
  }
)

export const createQuoteRequestWorkflow = createWorkflow(
  "create-quote-request",
  (input: QuoteRequestInput) => {
    const items = resolveQuoteItemsStep(input)
    const quote = createQuoteStep({ request: input, items })
    return new WorkflowResponse(quote)
  }
)
