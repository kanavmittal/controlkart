import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Select,
  Table,
  Tabs,
  Drawer,
  IconButton,
  Badge,
  Text,
  toast,
} from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useCallback, useEffect, useMemo, useState } from "react"
import { adminFetch, adminUpload } from "../lib/client"

type ProductDocument = {
  id: string
  title: string
  type: string
  file_url: string
}

type LibraryDoc = {
  title: string
  type: string
  file_url: string
  file_size: number | null
}

const DOC_TYPES = ["datasheet", "manual", "cad", "certificate", "other"]

function TypeSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <Select.Trigger>
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        {DOC_TYPES.map((t) => (
          <Select.Item key={t} value={t} className="capitalize">
            {t}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label size="small">{label}</Label>
      {children}
    </div>
  )
}

/** Downloads manager (datasheets, manuals, CAD, certificates) on the product page. */
const ProductDocumentsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [documents, setDocuments] = useState<ProductDocument[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState<"upload" | "link">("upload")

  // upload mode
  const [title, setTitle] = useState("")
  const [type, setType] = useState("datasheet")
  const [file, setFile] = useState<File | null>(null)

  // link-existing mode
  const [library, setLibrary] = useState<LibraryDoc[]>([])
  const [libFilter, setLibFilter] = useState("")
  const [picked, setPicked] = useState<LibraryDoc | null>(null)
  const [linkTitle, setLinkTitle] = useState("")
  const [linkType, setLinkType] = useState("datasheet")

  const [busy, setBusy] = useState(false)

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

  const openDrawer = () => {
    setTab("upload")
    setTitle("")
    setType("datasheet")
    setFile(null)
    setPicked(null)
    setLinkTitle("")
    setLinkType("datasheet")
    setLibFilter("")
    adminFetch<{ documents: LibraryDoc[] }>("/admin/documents")
      .then((r) => setLibrary(r.documents))
      .catch(() => {
        /* library is optional — upload still works */
      })
    setDrawerOpen(true)
  }

  // Existing docs not already attached to this product, filtered by search.
  const filteredLibrary = useMemo(() => {
    const attached = new Set(documents.map((d) => d.file_url))
    const q = libFilter.trim().toLowerCase()
    return library.filter(
      (d) =>
        !attached.has(d.file_url) &&
        (!q || d.title.toLowerCase().includes(q))
    )
  }, [library, documents, libFilter])

  const submitUpload = async () => {
    if (!title || !file) {
      return
    }
    setBusy(true)
    try {
      // Upload through the official File module (→ Cloudflare R2 in prod).
      const { files } = await adminUpload([file])
      const uploaded = files[0]
      if (!uploaded?.url) {
        throw new Error("Upload returned no URL")
      }
      await adminFetch(`/admin/products/${data.id}/documents`, {
        method: "POST",
        body: JSON.stringify({
          title,
          type,
          file_url: uploaded.url,
          file_size: file.size,
          display_order: documents.length,
        }),
      })
      toast.success("Document added")
      setDrawerOpen(false)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add document")
    } finally {
      setBusy(false)
    }
  }

  const submitLink = async () => {
    if (!picked || !linkTitle) {
      return
    }
    setBusy(true)
    try {
      // Reuse the existing file_url — no re-upload.
      await adminFetch(`/admin/products/${data.id}/documents`, {
        method: "POST",
        body: JSON.stringify({
          title: linkTitle,
          type: linkType,
          file_url: picked.file_url,
          file_size: picked.file_size ?? undefined,
          display_order: documents.length,
        }),
      })
      toast.success("Document linked")
      setDrawerOpen(false)
      refresh()
    } catch {
      toast.error("Failed to link document")
    } finally {
      setBusy(false)
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
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Downloads</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Datasheets, manuals, CAD &amp; certificates shown on the storefront.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={openDrawer}>
          Add document
        </Button>
      </div>

      <div className="px-6 py-2">
        {documents.length === 0 ? (
          <div className="py-4">
            <Text size="small" className="text-ui-fg-subtle">
              No documents yet. Use &ldquo;Add document&rdquo; to upload or link
              one.
            </Text>
          </div>
        ) : (
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
                  <Table.Cell className="max-w-60 truncate text-ui-fg-subtle">
                    {doc.file_url}
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <IconButton
                      size="small"
                      variant="transparent"
                      onClick={() => remove(doc.id)}
                    >
                      <Trash />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      {/* Add / link document drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Add document</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "upload" | "link")}
            >
              <Tabs.List>
                <Tabs.Trigger value="upload">Upload new</Tabs.Trigger>
                <Tabs.Trigger value="link">Link existing</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="upload" className="pt-4">
                <div className="flex flex-col gap-4">
                  <Field label="Title">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VFD-L Datasheet"
                    />
                  </Field>
                  <Field label="Type">
                    <TypeSelect value={type} onChange={setType} />
                  </Field>
                  <Field label="File">
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-ui-fg-subtle file:mr-3 file:rounded-md file:border file:border-ui-border-base file:bg-ui-button-neutral file:px-3 file:py-1.5 file:text-ui-fg-base hover:file:bg-ui-button-neutral-hover"
                    />
                  </Field>
                </div>
              </Tabs.Content>

              <Tabs.Content value="link" className="pt-4">
                <Input
                  size="small"
                  placeholder="Search uploaded documents…"
                  value={libFilter}
                  onChange={(e) => setLibFilter(e.target.value)}
                />
                <div className="mt-3 flex flex-col gap-2">
                  {filteredLibrary.length === 0 ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      No other uploaded documents to link.
                    </Text>
                  ) : (
                    filteredLibrary.map((d) => {
                      const isPicked = picked?.file_url === d.file_url
                      return (
                        <button
                          key={d.file_url}
                          type="button"
                          onClick={() => {
                            setPicked(d)
                            setLinkTitle(d.title)
                            setLinkType(d.type)
                          }}
                          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                            isPicked
                              ? "border-ui-fg-base"
                              : "border-ui-border-base hover:bg-ui-bg-base-hover"
                          }`}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-ui-fg-base">
                              {d.title}
                            </span>
                            <span className="truncate text-xs text-ui-fg-subtle">
                              {d.file_url}
                            </span>
                          </span>
                          <Badge size="2xsmall" color="grey">
                            {d.type}
                          </Badge>
                        </button>
                      )
                    })
                  )}
                </div>
                {picked ? (
                  <div className="mt-4 flex flex-col gap-3 border-t border-ui-border-base pt-4">
                    <Field label="Title (for this product)">
                      <Input
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                      />
                    </Field>
                    <Field label="Type">
                      <TypeSelect value={linkType} onChange={setLinkType} />
                    </Field>
                  </div>
                ) : null}
              </Tabs.Content>
            </Tabs>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">
                Cancel
              </Button>
            </Drawer.Close>
            {tab === "upload" ? (
              <Button
                size="small"
                onClick={submitUpload}
                isLoading={busy}
                disabled={!title || !file}
              >
                Add document
              </Button>
            ) : (
              <Button
                size="small"
                onClick={submitLink}
                isLoading={busy}
                disabled={!picked || !linkTitle}
              >
                Link document
              </Button>
            )}
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductDocumentsWidget
