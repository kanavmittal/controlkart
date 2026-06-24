import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ListTree, Plus, TriangleDownMini, TriangleRightMini } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  IconButton,
  Input,
  Label,
  Checkbox,
  Text,
  Badge,
  FocusModal,
  toast,
} from "@medusajs/ui"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { adminFetch } from "../../lib/client"
import { useSortableSensors, sortableStyle, DragHandle } from "../../lib/sortable"

type CatNode = {
  id: string
  name: string
  handle: string
  is_active: boolean
  rank: number | null
  parent_category_id: string | null
  category_children: CatNode[]
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

/** Sort each sibling array by rank — `include_descendants_tree` doesn't guarantee order. */
const sortTree = (nodes: CatNode[]): CatNode[] =>
  [...nodes]
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((n) => ({ ...n, category_children: sortTree(n.category_children ?? []) }))

const fetchTree = () =>
  adminFetch<{ product_categories: CatNode[] }>(
    "/admin/product-categories?" +
      new URLSearchParams({
        fields:
          "id,name,handle,is_active,rank,parent_category_id,*category_children",
        parent_category_id: "null",
        include_descendants_tree: "true",
        limit: "9999",
      }).toString()
  )

/* ------------------------------- Tree node -------------------------------- */

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onAddChild,
  reload,
}: {
  node: CatNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddChild: (parent: CatNode | null) => void
  reload: () => void
}) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const isOpen = expanded.has(node.id)
  const children = node.category_children ?? []
  const hasChildren = children.length > 0

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle(transform, transition, isDragging)}
      className={isDragging ? "shadow-elevation-card-rest rounded-md bg-ui-bg-base relative z-10" : ""}
    >
      <div
        className="group flex items-center gap-1.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-ui-bg-base-hover"
        style={{ paddingLeft: depth * 24 }}
      >
        <DragHandle {...attributes} {...listeners} />

        {hasChildren ? (
          <IconButton
            size="2xsmall"
            variant="transparent"
            onClick={() => onToggle(node.id)}
          >
            {isOpen ? <TriangleDownMini /> : <TriangleRightMini />}
          </IconButton>
        ) : (
          <span className="inline-block w-5" />
        )}

        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left outline-none"
          onClick={() => navigate(`/categories/${node.id}`)}
        >
          <Text
            size="small"
            leading="compact"
            weight="plus"
            className={node.is_active ? "" : "text-ui-fg-muted"}
          >
            {node.name}
          </Text>
          {!node.is_active ? (
            <Badge size="2xsmall" color="grey">
              Inactive
            </Badge>
          ) : null}
        </button>

        <Button
          size="small"
          variant="transparent"
          className="opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onAddChild(node)}
        >
          <Plus />
          Add sub-category
        </Button>
      </div>

      {isOpen && hasChildren ? (
        <SiblingList
          siblings={children}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onAddChild={onAddChild}
          reload={reload}
        />
      ) : null}
    </div>
  )
}

/* ----------------------- Sortable list of siblings ------------------------ */

function SiblingList({
  siblings,
  depth,
  expanded,
  onToggle,
  onAddChild,
  reload,
}: {
  siblings: CatNode[]
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddChild: (parent: CatNode | null) => void
  reload: () => void
}) {
  const sensors = useSortableSensors()
  const [items, setItems] = useState<CatNode[]>(siblings)

  // Resync only when the sibling set / order actually changes (e.g. after reload).
  const sig = siblings.map((s) => `${s.id}:${s.rank}`).join("|")
  useEffect(() => {
    setItems(siblings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = items.findIndex((c) => c.id === active.id)
    const newIndex = items.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered) // optimistic

    try {
      // Update only the moved category's rank; Medusa re-ranks its siblings.
      await adminFetch(`/admin/product-categories/${active.id}`, {
        method: "POST",
        body: JSON.stringify({ rank: newIndex }),
      })
      reload()
    } catch {
      toast.error("Failed to reorder categories")
      setItems(siblings) // rollback
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((c) => (
          <TreeRow
            key={c.id}
            node={c}
            depth={depth}
            expanded={expanded}
            onToggle={onToggle}
            onAddChild={onAddChild}
            reload={reload}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}

/* --------------------------------- Page ----------------------------------- */

type Draft = { name: string; handle: string; description: string; is_active: boolean }
const emptyDraft: Draft = { name: "", handle: "", description: "", is_active: true }

const CategoryTreePage = () => {
  const [roots, setRoots] = useState<CatNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [createOpen, setCreateOpen] = useState(false)
  const [parentFor, setParentFor] = useState<CatNode | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)

  const reload = () => {
    setLoading(true)
    fetchTree()
      .then((res) => setRoots(sortTree(res.product_categories ?? [])))
      .catch(() => toast.error("Failed to load categories"))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [])

  const onToggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  const onAddChild = (parent: CatNode | null) => {
    setParentFor(parent)
    setDraft(emptyDraft)
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    if (!draft.name.trim()) {
      toast.error("Name is required")
      return
    }
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        name: draft.name.trim(),
        is_active: draft.is_active,
        parent_category_id: parentFor?.id ?? null,
      }
      if (draft.handle.trim()) {
        body.handle = draft.handle.trim()
      }
      if (draft.description.trim()) {
        body.description = draft.description.trim()
      }
      await adminFetch("/admin/product-categories", {
        method: "POST",
        body: JSON.stringify(body),
      })
      toast.success("Category created")
      setCreateOpen(false)
      if (parentFor) {
        setExpanded((prev) => new Set(prev).add(parentFor.id))
      }
      reload()
    } catch {
      toast.error("Failed to create category")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Category Tree</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Browse the full category hierarchy. Drag siblings to reorder, add
            sub-categories, and click a name to open its page.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => onAddChild(null)}>
          <Plus />
          Add category
        </Button>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <Text size="small" className="px-2 text-ui-fg-subtle">
            Loading…
          </Text>
        ) : roots.length === 0 ? (
          <Text size="small" className="px-2 text-ui-fg-subtle">
            No categories yet. Use “Add category” to create your first one.
          </Text>
        ) : (
          <SiblingList
            siblings={roots}
            depth={0}
            expanded={expanded}
            onToggle={onToggle}
            onAddChild={onAddChild}
            reload={reload}
          />
        )}
      </div>

      {/* Create category / sub-category modal */}
      <FocusModal open={createOpen} onOpenChange={setCreateOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button size="small" onClick={submitCreate} isLoading={busy}>
              Create category
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center py-8">
            <div className="flex w-full max-w-lg flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Heading level="h2">
                  {parentFor ? "New sub-category" : "New category"}
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Parent: {parentFor ? parentFor.name : "Top level"}
                </Text>
              </div>

              <div className="flex flex-col gap-1">
                <Label size="small">Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      name: e.target.value,
                      handle: d.handle || slugify(e.target.value),
                    }))
                  }
                  placeholder="Panel-mounted PLCs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label size="small">Handle</Label>
                <Input
                  value={draft.handle}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, handle: slugify(e.target.value) }))
                  }
                  placeholder="panel-mounted-plcs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label size="small">Description (optional)</Label>
                <Input
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
              </div>

              <Label size="small" className="flex items-center gap-2">
                <Checkbox
                  checked={draft.is_active}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, is_active: !!v }))
                  }
                />
                Active
              </Label>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Category Tree",
  icon: ListTree,
})

export default CategoryTreePage
