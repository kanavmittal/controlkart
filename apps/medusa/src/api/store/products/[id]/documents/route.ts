import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../../modules/documents"
import type DocumentsModuleService from "../../../../../modules/documents/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const documentsService: DocumentsModuleService =
    req.scope.resolve(DOCUMENTS_MODULE)
  const documents = await documentsService.listProductDocuments(
    { product_id: req.params.id },
    { order: { display_order: "ASC" } }
  )
  res.json({ documents })
}
