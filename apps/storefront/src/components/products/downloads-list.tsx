import type { ProductDocumentDTO } from "@/lib/data/types"
import { BASE_URL } from "@/lib/config"

const TYPE_LABELS: Record<ProductDocumentDTO["type"], string> = {
  datasheet: "Datasheet",
  manual: "Manual",
  cad: "CAD File",
  certificate: "Certificate",
  other: "Document",
}

function resolveDownloadUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  if (url.startsWith("/")) {
    return `${BASE_URL}${url}`
  }
  return url
}

export function DownloadsList({
  documents,
}: {
  documents: ProductDocumentDTO[]
}) {
  if (!documents.length) {
    return null
  }
  return (
    <div className="border border-[var(--color-line)]">
      {documents.map((doc) => (
        <a
          key={doc.id}
          href={resolveDownloadUrl(doc.file_url)}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--color-surface-alt)]"
        >
          <span className="font-medium">{doc.title}</span>
          <span className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
            <span className="border border-[var(--color-line)] px-2 py-0.5 uppercase tracking-wide">
              {TYPE_LABELS[doc.type]}
            </span>
            Download ↓
          </span>
        </a>
      ))}
    </div>
  )
}
