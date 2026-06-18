import { MedusaService } from "@medusajs/framework/utils"
import Quote from "./models/quote"
import QuoteItem from "./models/quote-item"

class QuotesModuleService extends MedusaService({
  Quote,
  QuoteItem,
}) {}

export default QuotesModuleService
