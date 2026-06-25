import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../modules/documents"
import type DocumentsModuleService from "../../../modules/documents/service"

/**
 * Library of already-uploaded documents across all products, deduped by
 * `file_url`. Lets the product Downloads widget relink an existing file to
 * another product instead of re-uploading it (saves storage). Optional `?q`
 * filters by title.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const documentsService: DocumentsModuleService =
    req.scope.resolve(DOCUMENTS_MODULE)

  const all = await documentsService.listProductDocuments(
    {},
    { order: { display_order: "ASC" } }
  )

  // One entry per uploaded asset — first occurrence's title/type wins.
  const byUrl = new Map<
    string,
    { title: string; type: string; file_url: string; file_size: number | null }
  >()
  for (const d of all) {
    if (!d.file_url || byUrl.has(d.file_url)) {
      continue
    }
    byUrl.set(d.file_url, {
      title: d.title,
      type: d.type,
      file_url: d.file_url,
      file_size: d.file_size ?? null,
    })
  }

  const q = String((req.query.q as string) ?? "")
    .trim()
    .toLowerCase()
  let documents = [...byUrl.values()]
  if (q) {
    documents = documents.filter((d) => d.title.toLowerCase().includes(q))
  }

  res.json({ documents })
}
