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

type CreateDocumentBody = {
  title: string
  type?: "datasheet" | "manual" | "cad" | "certificate" | "other"
  file_url: string
  file_size?: number
  display_order?: number
}

export const POST = async (
  req: MedusaRequest<CreateDocumentBody>,
  res: MedusaResponse
) => {
  const documentsService: DocumentsModuleService =
    req.scope.resolve(DOCUMENTS_MODULE)
  const document = await documentsService.createProductDocuments({
    ...req.body,
    product_id: req.params.id,
  })
  res.status(201).json({ document })
}
