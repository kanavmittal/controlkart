import {
  BadgeCheck,
  Box,
  BookOpen,
  File as FileIcon,
  FileText,
  Info,
  ListChecks,
  Globe,
  Shield,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ProductDocumentDTO, SpecValueDTO } from "@/lib/data/types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { resolveDownloadUrl } from "@/components/product/download-utils"

const DOCUMENT_TYPE_LABELS: Record<ProductDocumentDTO["type"], string> = {
  datasheet: "Datasheet",
  manual: "Manual",
  cad: "CAD File",
  certificate: "Certificate",
  other: "Document",
}

const DOCUMENT_TYPE_ICONS: Record<ProductDocumentDTO["type"], typeof FileText> = {
  datasheet: FileText,
  manual: BookOpen,
  cad: Box,
  certificate: BadgeCheck,
  other: FileIcon,
}

const TRIGGER_CLASSNAME =
  "py-4 text-[15px] font-medium text-[var(--color-athens-dark)] hover:no-underline"

const ITEM_CLASSNAME = "border-b border-dashed border-[var(--color-athens-line)] last:border-b-0"

export interface ProductAccordionsProps {
  description?: string | null
  specs: SpecValueDTO[]
  documents: ProductDocumentDTO[]
  /** Static shipping copy. T29 passes this from config; the item is omitted
   * entirely when not provided. */
  shipping?: string
  /** Static warranty copy. T29 passes this from config; the item is omitted
   * entirely when not provided. */
  warranty?: string
  className?: string
}

/**
 * PDP left-column accordion stack — Athens restyle of clone
 * `ProductAccordions.tsx`, rebuilt on shadcn/Base UI `Accordion` instead of
 * native `<details>`. Purely presentational: all data arrives via props from
 * the server-fetched PDP page (assembled in T29). No "use client" needed —
 * `@base-ui/react/accordion` marks its own client boundary internally (see
 * `components/ui/accordion.tsx`, which also has no directive).
 *
 * No Reviews accordion (omitted by decision).
 *
 * Ported (restyled with Athens hairline tokens, logic unchanged):
 * - Specifications: grouped table rendering from the old
 *   `products/spec-table.tsx` (deletion owner: T29).
 * - Documents: typed download list from the old
 *   `products/downloads-list.tsx` (deletion owner: T29). `resolveDownloadUrl`
 *   now lives in `product/download-utils.ts` so `quick-view-dialog.tsx` can
 *   keep using it once the old file is deleted.
 */
export function ProductAccordions({
  description,
  specs,
  documents,
  shipping,
  warranty,
  className,
}: ProductAccordionsProps) {
  const hasDescription = Boolean(description?.trim())
  const hasSpecs = specs.length > 0
  const hasDocuments = documents.length > 0
  const hasShipping = Boolean(shipping)
  const hasWarranty = Boolean(warranty)

  if (!hasDescription && !hasSpecs && !hasDocuments && !hasShipping && !hasWarranty) {
    return null
  }

  // Description + Specifications default-open (when present); the rest start closed.
  const defaultValue = [
    hasDescription && "description",
    hasSpecs && "specifications",
  ].filter((v): v is string => Boolean(v))

  return (
    <Accordion
      multiple
      defaultValue={defaultValue}
      className={cn("border-y border-dashed border-[var(--color-athens-line)]", className)}
    >
      {hasDescription && (
        <AccordionItem value="description" className={ITEM_CLASSNAME}>
          <AccordionTrigger className={TRIGGER_CLASSNAME}>
            <span className="flex items-center gap-3">
              <Info className="size-5 shrink-0 text-[var(--color-athens-blue)]" aria-hidden />
              Description
            </span>
          </AccordionTrigger>
          <AccordionContent className="athens-rte pb-4">
            {description!.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </AccordionContent>
        </AccordionItem>
      )}

      {hasSpecs && (
        <AccordionItem value="specifications" className={ITEM_CLASSNAME}>
          <AccordionTrigger className={TRIGGER_CLASSNAME}>
            <span className="flex items-center gap-3">
              <ListChecks className="size-5 shrink-0 text-[var(--color-athens-blue)]" aria-hidden />
              Specifications
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SpecificationsPanel specs={specs} />
          </AccordionContent>
        </AccordionItem>
      )}

      {hasDocuments && (
        <AccordionItem value="documents" className={ITEM_CLASSNAME}>
          <AccordionTrigger className={TRIGGER_CLASSNAME}>
            <span className="flex items-center gap-3">
              <FileText className="size-5 shrink-0 text-[var(--color-athens-blue)]" aria-hidden />
              Documents
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <DocumentsPanel documents={documents} />
          </AccordionContent>
        </AccordionItem>
      )}

      {hasShipping && (
        <AccordionItem value="shipping" className={ITEM_CLASSNAME}>
          <AccordionTrigger className={TRIGGER_CLASSNAME}>
            <span className="flex items-center gap-3">
              <Globe className="size-5 shrink-0 text-[var(--color-athens-blue)]" aria-hidden />
              Shipping
            </span>
          </AccordionTrigger>
          <AccordionContent className="athens-rte pb-4">
            <p>{shipping}</p>
          </AccordionContent>
        </AccordionItem>
      )}

      {hasWarranty && (
        <AccordionItem value="warranty" className={ITEM_CLASSNAME}>
          <AccordionTrigger className={TRIGGER_CLASSNAME}>
            <span className="flex items-center gap-3">
              <Shield className="size-5 shrink-0 text-[var(--color-athens-blue)]" aria-hidden />
              Warranty
            </span>
          </AccordionTrigger>
          <AccordionContent className="athens-rte pb-4">
            <p>{warranty}</p>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  )
}

/** Ported from `products/spec-table.tsx`: border-based, grouped spec table. */
function SpecificationsPanel({ specs }: { specs: SpecValueDTO[] }) {
  const groups = specs.reduce<Record<string, SpecValueDTO[]>>((acc, spec) => {
    ;(acc[spec.group] ??= []).push(spec)
    return acc
  }, {})

  return (
    <div className="border border-border">
      {Object.entries(groups).map(([group, rows]) => (
        <div key={group}>
          <div className="border-b border-border bg-[var(--color-athens-band)] px-4 py-2 text-xs font-semibold tracking-wide text-[var(--color-athens-body)] uppercase">
            {group}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((spec) => (
                <tr key={spec.id} className="border-b border-border last:border-b-0">
                  <td className="w-1/3 px-4 py-2.5 align-top font-medium text-[var(--color-athens-dark)]">
                    {spec.attribute}
                  </td>
                  <td className="px-4 py-2.5 align-top text-[var(--color-athens-body)]">
                    {spec.value}
                    {spec.unit ? ` ${spec.unit}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

/** Ported from `products/downloads-list.tsx`: typed download links, now with per-type lucide icons. */
function DocumentsPanel({ documents }: { documents: ProductDocumentDTO[] }) {
  return (
    <div className="border border-border">
      {documents.map((doc) => {
        const Icon = DOCUMENT_TYPE_ICONS[doc.type]
        return (
          <a
            key={doc.id}
            href={resolveDownloadUrl(doc.file_url)}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--color-athens-band)]"
          >
            <span className="flex items-center gap-2 font-medium text-[var(--color-athens-dark)]">
              <Icon className="size-4 shrink-0 text-[var(--color-athens-body)]" aria-hidden />
              {doc.title}
            </span>
            <span className="flex items-center gap-3 text-xs text-[var(--color-athens-body)]">
              <span className="border border-border px-2 py-0.5 tracking-wide uppercase">
                {DOCUMENT_TYPE_LABELS[doc.type]}
              </span>
              Download ↓
            </span>
          </a>
        )
      })}
    </div>
  )
}
