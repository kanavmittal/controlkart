import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Newspaper } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Input,
  Select,
  Table,
  Textarea,
  Badge,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import MDEditor from "@uiw/react-md-editor"
import "@uiw/react-md-editor/markdown-editor.css"
import { adminFetch, adminUpload } from "../../lib/client"

type ContentPost = {
  id: string
  type: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_image: string | null
  seo_title: string | null
  seo_description: string | null
  related_product_ids: string | null
  published_at: string | null
  updated_at?: string
}

const POST_TYPES = ["news", "case_study", "guide", "application_note"]

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

type FormState = {
  id: string
  title: string
  slug: string
  type: string
  excerpt: string
  body: string
  cover_image: string
  seo_title: string
  seo_description: string
  related_product_ids: string
  published_at: string | null
}

const EMPTY: FormState = {
  id: "",
  title: "",
  slug: "",
  type: "news",
  excerpt: "",
  body: "",
  cover_image: "",
  seo_title: "",
  seo_description: "",
  related_product_ids: "",
  published_at: null,
}

const ContentPage = () => {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [mode, setMode] = useState<"list" | "editor">("list")
  const [form, setForm] = useState<FormState>(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    adminFetch<{ posts: ContentPost[] }>("/admin/content/posts")
      .then((res) => setPosts(res.posts))
      .catch(() => toast.error("Failed to load posts"))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm(EMPTY)
    setSlugTouched(false)
    setMode("editor")
  }

  const openEdit = (p: ContentPost) => {
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: p.type,
      excerpt: p.excerpt ?? "",
      body: p.body ?? "",
      cover_image: p.cover_image ?? "",
      seo_title: p.seo_title ?? "",
      seo_description: p.seo_description ?? "",
      related_product_ids: p.related_product_ids ?? "",
      published_at: p.published_at,
    })
    setSlugTouched(true)
    setMode("editor")
  }

  const onTitle = (v: string) => {
    set("title", v)
    if (!slugTouched) set("slug", slugify(v))
  }

  const uploadCover = async (file: File) => {
    setUploading(true)
    try {
      const { files } = await adminUpload([file])
      const url = files[0]?.url
      if (!url) throw new Error("Upload returned no URL")
      set("cover_image", url)
      toast.success("Cover image uploaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cover upload failed")
    } finally {
      setUploading(false)
    }
  }

  // publish: true → publish now, false → unpublish/draft, undefined → keep current
  const save = async (publish?: boolean) => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required")
      return
    }
    let published_at = form.published_at
    if (publish === true) published_at = new Date().toISOString()
    if (publish === false) published_at = null

    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      type: form.type,
      excerpt: form.excerpt || undefined,
      body: form.body,
      cover_image: form.cover_image || undefined,
      seo_title: form.seo_title || undefined,
      seo_description: form.seo_description || undefined,
      related_product_ids: form.related_product_ids || undefined,
      published_at,
    }

    setSaving(true)
    try {
      if (form.id) {
        await adminFetch(`/admin/content/posts/${form.id}`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
        toast.success("Post updated")
      } else {
        await adminFetch("/admin/content/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        toast.success(published_at ? "Post published" : "Draft saved")
      }
      setMode("list")
      refresh()
    } catch {
      toast.error("Failed to save the post")
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (p: ContentPost) => {
    try {
      await adminFetch(`/admin/content/posts/${p.id}`, {
        method: "POST",
        body: JSON.stringify({
          published_at: p.published_at ? null : new Date().toISOString(),
        }),
      })
      refresh()
    } catch {
      toast.error("Failed to update the post")
    }
  }

  const remove = async (id: string) => {
    try {
      await adminFetch(`/admin/content/posts/${id}`, { method: "DELETE" })
      toast.success("Post deleted")
      refresh()
    } catch {
      toast.error("Failed to delete the post")
    }
  }

  // ---- Editor ----
  if (mode === "editor") {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              size="small"
              variant="transparent"
              onClick={() => setMode("list")}
            >
              ← Posts
            </Button>
            <Heading level="h1">{form.id ? "Edit post" : "New post"}</Heading>
          </div>
          <div className="flex gap-2">
            {form.id ? (
              <>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => save(form.published_at ? false : true)}
                >
                  {form.published_at ? "Unpublish" : "Publish"}
                </Button>
                <Button size="small" isLoading={saving} onClick={() => save()}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => save(false)}
                >
                  Save draft
                </Button>
                <Button
                  size="small"
                  isLoading={saving}
                  onClick={() => save(true)}
                >
                  Publish
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-5 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label size="small" weight="plus">
                Title
              </Label>
              <Input
                placeholder="How to choose a modular PLC"
                value={form.title}
                onChange={(e) => onTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label size="small" weight="plus">
                Slug
              </Label>
              <Input
                placeholder="how-to-choose-a-modular-plc"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  set("slug", e.target.value)
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label size="small" weight="plus">
                Type
              </Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {POST_TYPES.map((t) => (
                    <Select.Item key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label size="small" weight="plus">
                Cover image
              </Label>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadCover(f)
                  e.target.value = ""
                }}
              />
              {form.cover_image ? (
                <div className="flex items-center gap-3">
                  <img
                    src={form.cover_image}
                    alt="cover"
                    className="h-16 w-24 rounded object-cover"
                  />
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                  >
                    Replace
                  </Button>
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => set("cover_image", "")}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  size="small"
                  variant="secondary"
                  isLoading={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  Upload image
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-1">
            <Label size="small" weight="plus">
              Excerpt
            </Label>
            <Textarea
              placeholder="Short summary shown in listings and used as the meta description fallback."
              rows={2}
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
            />
          </div>

          <div className="grid gap-1" data-color-mode="light">
            <Label size="small" weight="plus">
              Body (markdown)
            </Label>
            <MDEditor
              value={form.body}
              onChange={(v) => set("body", v ?? "")}
              height={460}
              preview="live"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label size="small" weight="plus">
                SEO title
              </Label>
              <Input
                placeholder="Optional — defaults to the title"
                value={form.seo_title}
                onChange={(e) => set("seo_title", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label size="small" weight="plus">
                SEO description
              </Label>
              <Input
                placeholder="Optional — defaults to the excerpt"
                value={form.seo_description}
                onChange={(e) => set("seo_description", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label size="small" weight="plus">
              Related product IDs
            </Label>
            <Input
              placeholder="prod_123, prod_456 (comma-separated, for internal linking)"
              value={form.related_product_ids}
              onChange={(e) => set("related_product_ids", e.target.value)}
            />
            <Text size="small" className="text-ui-fg-subtle">
              Comma-separated Medusa product IDs surfaced on the post.
            </Text>
          </div>
        </div>
      </Container>
    )
  }

  // ---- List ----
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Content — News, Case Studies & Guides</Heading>
        <Button size="small" onClick={openNew}>
          New post
        </Button>
      </div>
      <div className="px-6 py-4">
        {posts.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No posts yet. Click “New post” to write your first one.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {posts.map((post) => (
                <Table.Row key={post.id}>
                  <Table.Cell className="font-medium">{post.title}</Table.Cell>
                  <Table.Cell className="capitalize">
                    {post.type.replace(/_/g, " ")}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="2xsmall"
                      color={post.published_at ? "green" : "grey"}
                    >
                      {post.published_at ? "Published" : "Draft"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => openEdit(post)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => togglePublish(post)}
                      >
                        {post.published_at ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => remove(post.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Content",
  icon: Newspaper,
})

export default ContentPage
