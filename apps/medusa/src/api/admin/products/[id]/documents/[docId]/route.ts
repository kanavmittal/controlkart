import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../../../modules/documents"
import type DocumentsModuleService from "../../../../../../modules/documents/service"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const documentsService: DocumentsModuleService =
    req.scope.resolve(DOCUMENTS_MODULE)
  await documentsService.deleteProductDocuments(req.params.docId)
  res.json({ id: req.params.docId, deleted: true })
}
