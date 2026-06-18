import { MedusaService } from "@medusajs/framework/utils"
import ProductDocument from "./models/product-document"

class DocumentsModuleService extends MedusaService({
  ProductDocument,
}) {}

export default DocumentsModuleService
