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
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { adminFetch } from "../../lib/client"

type ContentPost = {
  id: string
  type: string
  title: string
  slug: string
  published_at: string | null
}

const POST_TYPES = ["news", "case_study", "guide", "application_note"]

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const ContentPage = () => {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [title, setTitle] = useState("")
  const [type, setType] = useState("news")
  const [excerpt, setExcerpt] = useState("")
  const [body, setBody] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")

  const refresh = useCallback(() => {
    adminFetch<{ posts: ContentPost[] }>("/admin/content/posts")
      .then((res) => setPosts(res.posts))
      .catch(() => toast.error("Failed to load posts"))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = async (publish: boolean) => {
    if (!title || !body) {
      toast.error("Title and body are required")
      return
    }
    try {
      await adminFetch("/admin/content/posts", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug: slugify(title),
          type,
          excerpt: excerpt || undefined,
          body,
          seo_title: seoTitle || undefined,
          seo_description: seoDescription || undefined,
          published_at: publish ? new Date().toISOString() : null,
        }),
      })
      setTitle("")
      setExcerpt("")
      setBody("")
      setSeoTitle("")
      setSeoDescription("")
      toast.success(publish ? "Post published" : "Draft saved")
      refresh()
    } catch {
      toast.error("Failed to create post")
    }
  }

  const togglePublish = async (post: ContentPost) => {
    try {
      await adminFetch(`/admin/content/posts/${post.id}`, {
        method: "POST",
        body: JSON.stringify({
          published_at: post.published_at ? null : new Date().toISOString(),
        }),
      })
      refresh()
    } catch {
      toast.error("Failed to update post")
    }
  }

  const remove = async (id: string) => {
    try {
      await adminFetch(`/admin/content/posts/${id}`, { method: "DELETE" })
      refresh()
    } catch {
      toast.error("Failed to delete post")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Content - News, Case Studies & Guides</Heading>
      </div>
      <div className="grid gap-2 px-6 py-4">
        <div className="flex gap-2">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          <Select value={type} onValueChange={setType}>
            <Select.Trigger className="w-44">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {POST_TYPES.map((t) => (
                <Select.Item key={t} value={t}>
                  {t.replace("_", " ")}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <Input
          placeholder="Excerpt (shown in listings and meta description fallback)"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
        <Textarea
          placeholder="Body (markdown)"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="SEO title (optional)"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="SEO description (optional)"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => create(true)}>Publish</Button>
          <Button variant="secondary" onClick={() => create(false)}>
            Save Draft
          </Button>
        </div>
      </div>
      <div className="px-6 py-4">
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
                  {post.type.replace("_", " ")}
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
                  <div className="flex gap-2">
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
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Content",
  icon: Newspaper,
})

export default ContentPage
