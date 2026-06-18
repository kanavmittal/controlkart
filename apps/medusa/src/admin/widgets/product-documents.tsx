import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Button,
  Input,
  Select,
  Table,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { adminFetch } from "../lib/client"

type ProductDocument = {
  id: string
  title: string
  type: string
  file_url: string
}

const DOC_TYPES = ["datasheet", "manual", "cad", "certificate", "other"]

/** Downloads manager (datasheets, manuals, CAD, certificates) on the product page. */
const ProductDocumentsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [documents, setDocuments] = useState<ProductDocument[]>([])
  const [title, setTitle] = useState("")
  const [type, setType] = useState("datasheet")
  const [fileUrl, setFileUrl] = useState("")

  const refresh = useCallback(() => {
    adminFetch<{ documents: ProductDocument[] }>(
      `/admin/products/${data.id}/documents`
    )
      .then((res) => setDocuments(res.documents))
      .catch(() => toast.error("Failed to load documents"))
  }, [data.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = async () => {
    if (!title || !fileUrl) {
      toast.error("Title and file URL are required")
      return
    }
    try {
      await adminFetch(`/admin/products/${data.id}/documents`, {
        method: "POST",
        body: JSON.stringify({
          title,
          type,
          file_url: fileUrl,
          display_order: documents.length,
        }),
      })
      setTitle("")
      setFileUrl("")
      toast.success("Document added")
      refresh()
    } catch {
      toast.error("Failed to add document")
    }
  }

  const remove = async (docId: string) => {
    try {
      await adminFetch(`/admin/products/${data.id}/documents/${docId}`, {
        method: "DELETE",
      })
      refresh()
    } catch {
      toast.error("Failed to delete document")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Downloads</Heading>
      </div>
      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>URL</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {documents.map((doc) => (
              <Table.Row key={doc.id}>
                <Table.Cell>{doc.title}</Table.Cell>
                <Table.Cell className="capitalize">{doc.type}</Table.Cell>
                <Table.Cell className="max-w-60 truncate">
                  {doc.file_url}
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => remove(doc.id)}
                  >
                    Delete
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Input
            size="small"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select size="small" value={type} onValueChange={setType}>
            <Select.Trigger className="w-36">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {DOC_TYPES.map((t) => (
                <Select.Item key={t} value={t}>
                  {t}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Input
            size="small"
            placeholder="File URL"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="min-w-72 flex-1"
          />
          <Button size="small" onClick={add}>
            Add Document
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductDocumentsWidget
