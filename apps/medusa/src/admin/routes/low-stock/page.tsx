import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ExclamationCircle } from "@medusajs/icons"
import {
  Badge,
  Button,
  Code,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { adminFetch } from "../../lib/client"

type LowStockRow = {
  variant_id: string
  sku: string | null
  title: string | null
  product_title: string | null
  available: number
  stocked: number
  reserved: number
  threshold: number
}

type LowStockResponse = {
  variants: LowStockRow[]
  count: number
  limit: number
  offset: number
}

const PAGE_SIZE = 50

const LowStockPage = () => {
  const [rows, setRows] = useState<LowStockRow[]>([])
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (nextOffset: number) => {
    setLoading(true)
    try {
      const data = await adminFetch<LowStockResponse>(
        `/admin/wms/low-stock?limit=${PAGE_SIZE}&offset=${nextOffset}`
      )
      setRows(data.variants)
      setCount(data.count)
      setOffset(nextOffset)
    } catch {
      toast.error("Failed to load low-stock variants")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(0)
  }, [refresh])

  const hasPrev = offset > 0
  const hasNext = offset + PAGE_SIZE < count

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Heading level="h1">Low Stock</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Published variants where available (stocked − reserved) is at or
            below the variant&apos;s threshold. Set a per-variant threshold via
            the variant metadata key <Code>low_stock_threshold</Code> (a
            number); without it the threshold is 0, so only variants at or
            below zero available appear here.
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          onClick={() => refresh(offset)}
          isLoading={loading}
        >
          Refresh
        </Button>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell>Product / Variant</Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                Available
              </Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                Stocked
              </Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                Reserved
              </Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                Threshold
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row
                key={row.variant_id}
                className={row.available <= 0 ? "bg-ui-tag-red-bg" : undefined}
              >
                <Table.Cell className="font-medium">
                  {row.sku ?? "—"}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col">
                    <Text size="small" leading="compact" weight="plus">
                      {row.product_title ?? "—"}
                    </Text>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      {row.title ?? "—"}
                    </Text>
                  </div>
                </Table.Cell>
                <Table.Cell className="text-right">
                  {row.available <= 0 ? (
                    <Badge size="2xsmall" color="red">
                      {row.available}
                    </Badge>
                  ) : (
                    row.available
                  )}
                </Table.Cell>
                <Table.Cell className="text-right">{row.stocked}</Table.Cell>
                <Table.Cell className="text-right">{row.reserved}</Table.Cell>
                <Table.Cell className="text-right">{row.threshold}</Table.Cell>
              </Table.Row>
            ))}
            {!rows.length && (
              <Table.Row>
                <Table.Cell className="text-ui-fg-subtle">
                  {loading
                    ? "Loading low-stock variants…"
                    : "No variants are at or below their low-stock threshold."}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>

        <div className="mt-4 flex items-center justify-between">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {count
              ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, count)} of ${count}`
              : "0 results"}
          </Text>
          <div className="flex items-center gap-x-2">
            <Button
              size="small"
              variant="secondary"
              disabled={!hasPrev || loading}
              onClick={() => refresh(Math.max(0, offset - PAGE_SIZE))}
            >
              Prev
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={!hasNext || loading}
              onClick={() => refresh(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Low Stock",
  icon: ExclamationCircle,
})

export default LowStockPage
