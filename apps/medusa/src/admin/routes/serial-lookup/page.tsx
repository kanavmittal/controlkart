import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../../lib/client"

type SerialHit = {
  id: string
  serial: string
  status: "in_stock" | "shipped" | "removed"
  variant: { id: string; sku: string | null; title: string | null }
  purchase_order: { id: string; display_id: number | null } | null
  order_id: string | null
  received_by: { id: string; name: string | null } | null
  created_at: string
}

const STATUS_BADGE: Record<
  SerialHit["status"],
  { label: string; color: "green" | "blue" | "red" }
> = {
  in_stock: { label: "In stock", color: "green" },
  shipped: { label: "Shipped", color: "blue" },
  removed: { label: "Removed", color: "red" },
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {label}
      </Text>
      <div className="text-right">{children}</div>
    </div>
  )
}

const SerialLookupPage = () => {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<SerialHit[] | null>(null)
  const [searching, setSearching] = useState(false)

  const search = async () => {
    const serial = q.trim()
    if (!serial) {
      return
    }
    setSearching(true)
    try {
      const res = await adminFetch<{ serials: SerialHit[] }>(
        `/admin/wms/serials?q=${encodeURIComponent(serial)}`
      )
      setResults(res.serials)
    } catch {
      toast.error("Serial lookup failed")
    } finally {
      setSearching(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Serial Lookup</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Find a serialized unit by its exact serial number — where it came
          from, whether it is in stock, and which order it shipped on.
        </Text>
      </div>

      <div className="flex items-center gap-2 px-6 py-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              search()
            }
          }}
          placeholder="Scan or type an exact serial number"
          autoFocus
        />
        <Button
          size="small"
          onClick={search}
          isLoading={searching}
          disabled={!q.trim()}
        >
          Search
        </Button>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        {results === null ? (
          <Text size="small" className="text-ui-fg-subtle">
            Enter a serial number above to look it up. Matching is exact — a
            serial can exist on more than one variant.
          </Text>
        ) : results.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No unit found with that serial. Check the number and try again —
            the search is exact-match.
          </Text>
        ) : (
          results.map((hit) => {
            const badge = STATUS_BADGE[hit.status] ?? {
              label: hit.status,
              color: "green" as const,
            }
            return (
              <div
                key={hit.id}
                className="flex flex-col gap-2 rounded-lg border border-ui-border-base p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Text size="small" leading="compact" weight="plus" className="font-mono">
                    {hit.serial}
                  </Text>
                  <Badge size="2xsmall" color={badge.color}>
                    {badge.label}
                  </Badge>
                </div>

                <Row label="Variant">
                  <Text size="small" leading="compact">
                    {hit.variant.sku ?? hit.variant.id}
                    {hit.variant.title ? (
                      <span className="text-ui-fg-subtle">
                        {" "}
                        · {hit.variant.title}
                      </span>
                    ) : null}
                  </Text>
                </Row>

                {hit.purchase_order ? (
                  <Row label="Purchase order">
                    <Text size="small" leading="compact">
                      {hit.purchase_order.display_id != null
                        ? `PO #${hit.purchase_order.display_id}`
                        : hit.purchase_order.id}
                    </Text>
                  </Row>
                ) : null}

                {hit.order_id ? (
                  <Row label="Shipped on order">
                    <Text size="small" leading="compact" className="font-mono">
                      {hit.order_id}
                    </Text>
                  </Row>
                ) : null}

                {hit.received_by ? (
                  <Row label="Received by">
                    <Text size="small" leading="compact">
                      {hit.received_by.name ?? hit.received_by.id}
                    </Text>
                  </Row>
                ) : null}

                <Row label="Received at">
                  <Text size="small" leading="compact">
                    {formatDateTime(hit.created_at)}
                  </Text>
                </Row>
              </div>
            )
          })
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Serial Lookup",
  icon: MagnifyingGlass,
})

export default SerialLookupPage
