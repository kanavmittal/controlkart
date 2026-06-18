import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import {
  Container,
  Heading,
  Table,
  Badge,
  Select,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { adminFetch } from "../../lib/client"

type Quote = {
  id: string
  status: string
  company_name: string
  contact_name: string
  email: string
  phone: string
  pincode: string
  gstin: string | null
  created_at: string
  items: { id: string; sku: string; quantity: number }[]
}

const STATUSES = [
  "requested",
  "under_review",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "converted",
]

const statusColor = (
  status: string
): "orange" | "blue" | "green" | "red" | "grey" => {
  switch (status) {
    case "requested":
      return "orange"
    case "under_review":
    case "sent":
      return "blue"
    case "accepted":
    case "converted":
      return "green"
    case "rejected":
      return "red"
    default:
      return "grey"
  }
}

const QuotesPage = () => {
  const [quotes, setQuotes] = useState<Quote[]>([])

  const refresh = useCallback(() => {
    adminFetch<{ quotes: Quote[] }>("/admin/quotes")
      .then((res) => setQuotes(res.quotes))
      .catch(() => toast.error("Failed to load quotes"))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminFetch(`/admin/quotes/${id}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      })
      toast.success("Quote updated")
      refresh()
    } catch {
      toast.error("Failed to update quote")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Quote Requests</Heading>
      </div>
      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell>Contact</Table.HeaderCell>
              <Table.HeaderCell>GSTIN</Table.HeaderCell>
              <Table.HeaderCell>Items</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Update</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quotes.map((quote) => (
              <Table.Row key={quote.id}>
                <Table.Cell className="font-medium">
                  {quote.company_name}
                </Table.Cell>
                <Table.Cell>
                  <div>{quote.contact_name}</div>
                  <div className="text-ui-fg-subtle text-xs">
                    {quote.email} · {quote.phone}
                  </div>
                </Table.Cell>
                <Table.Cell>{quote.gstin ?? "-"}</Table.Cell>
                <Table.Cell>
                  {quote.items
                    .map((i) => `${i.sku} ×${i.quantity}`)
                    .join(", ")}
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={statusColor(quote.status)}>
                    {quote.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Select
                    size="small"
                    value={quote.status}
                    onValueChange={(v) => updateStatus(quote.id, v)}
                  >
                    <Select.Trigger className="w-36">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {STATUSES.map((s) => (
                        <Select.Item key={s} value={s}>
                          {s}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Table.Cell>
              </Table.Row>
            ))}
            {!quotes.length && (
              <Table.Row>
                <Table.Cell className="text-ui-fg-subtle">
                  No quote requests yet.
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Quotes",
  icon: DocumentText,
})

export default QuotesPage
