import { storeFetch } from "../medusa"
import type { ContentPostDTO } from "./types"

export async function listPosts(params: { type?: string; limit?: number } = {}) {
  const { posts, count } = await storeFetch<{
    posts: ContentPostDTO[]
    count: number
  }>("/store/content/posts", {
    query: { type: params.type, limit: params.limit ?? 20 },
    revalidate: 120,
    tags: ["content"],
  })
  return { posts, count }
}

export async function getPostBySlug(slug: string): Promise<ContentPostDTO | null> {
  try {
    const { post } = await storeFetch<{ post: ContentPostDTO }>(
      `/store/content/posts/${slug}`,
      { revalidate: 120, tags: ["content"] }
    )
    return post
  } catch {
    return null
  }
}
