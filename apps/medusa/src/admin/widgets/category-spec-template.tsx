import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  DetailWidgetProps,
  AdminProductCategory,
} from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Button,
  Checkbox,
  Label,
  Text,
  IconButton,
  Badge,
  FocusModal,
  toast,
} from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useEffect, useMemo, useState } from "react"
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
import { adminFetch } from "../lib/client"
import { useSortableSensors, sortableStyle, DragHandle } from "../lib/sortable"

type CatalogAttribute = {
  id: string
  name: string
  code: string
  group_code: string
  unit: string | null
}

type Group = { code: string; name: string }

type TemplateRow = {
  attribute_code: string
  name: string
  unit: string | null
  group_code: string
  is_required: boolean
}

type InheritedRow = {
  attribute_code: string
  name: string
  unit: string | null
  group: string
  is_required: boolean
  source_category: string | null
}

/** Shared column template so the header, editable rows and inherited rows all line up like a sheet. */
const GRID =
  "grid grid-cols-[28px_1fr_160px_110px_40px] items-center gap-3 px-6"

/* ------------------------------ Sortable row ------------------------------ */

function SpecTemplateRow({
  row,
  groupLabel,
  onToggleRequired,
  onRemove,
}: {
  row: TemplateRow
  groupLabel: string
  onToggleRequired: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.attribute_code })

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle(transform, transition, isDragging)}
      className={`${GRID} border-b border-ui-border-base bg-ui-bg-base py-2.5 last:border-b-0 ${
        isDragging ? "shadow-elevation-card-rest rounded-md relative z-10" : ""
      }`}
    >
      <DragHandle {...attributes} {...listeners} />
      <Text size="small" leading="compact" weight="plus">
        {row.name}
        {row.unit ? (
          <span className="text-ui-fg-subtle font-normal"> ({row.unit})</span>
        ) : null}
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle truncate">
        {groupLabel}
      </Text>
      <Label
        size="small"
        className="flex items-center gap-2 text-ui-fg-subtle"
      >
        <Checkbox checked={row.is_required} onCheckedChange={onToggleRequired} />
        Required
      </Label>
      <IconButton size="small" variant="transparent" onClick={onRemove}>
        <Trash />
      </IconButton>
    </div>
  )
}

/* -------------------------------- Widget ---------------------------------- */

/**
 * Lets merchants define which spec fields (and in what order) products in this
 * category display — this is what drives the per-category spec table instead of
 * a single global field list. Rows are drag-sortable; order is persisted as
 * `display_order` on save.
 */
const CategorySpecTemplateWidget = ({
  data,
}: DetailWidgetProps<AdminProductCategory>) => {
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [inherited, setInherited] = useState<InheritedRow[]>([])
  const [catalog, setCatalog] = useState<CatalogAttribute[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const sensors = useSortableSensors()

  useEffect(() => {
    Promise.all([
      adminFetch<{
        templates: (TemplateRow & { id: string })[]
        inherited: InheritedRow[]
      }>(`/admin/categories/${data.id}/spec-template`),
      adminFetch<{ attributes: CatalogAttribute[] }>("/admin/specs/attributes"),
      adminFetch<{ groups: Group[] }>("/admin/specs/groups"),
    ])
      .then(([tmplRes, catRes, grpRes]) => {
        setRows(
          tmplRes.templates.map((t) => ({
            attribute_code: t.attribute_code,
            name: t.name,
            unit: t.unit,
            group_code: t.group_code,
            is_required: t.is_required,
          }))
        )
        setInherited(tmplRes.inherited ?? [])
        setCatalog(catRes.attributes)
        setGroups(grpRes.groups ?? [])
      })
      .catch(() => toast.error("Failed to load spec template"))
      .finally(() => setLoading(false))
  }, [data.id])

  const groupName = (code: string) =>
    groups.find((g) => g.code === code)?.name ?? code

  const availableToAdd = useMemo(() => {
    const used = new Set(rows.map((r) => r.attribute_code))
    const inh = new Set(inherited.map((i) => i.attribute_code))
    return catalog.filter((a) => !used.has(a.code) && !inh.has(a.code))
  }, [catalog, rows, inherited])

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) {
      return
    }
    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.attribute_code === active.id)
      const newIndex = prev.findIndex((r) => r.attribute_code === over.id)
      if (oldIndex === -1 || newIndex === -1) {
        return prev
      }
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const toggleRequired = (code: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.attribute_code === code ? { ...r, is_required: !r.is_required } : r
      )
    )

  const removeRow = (code: string) =>
    setRows((prev) => prev.filter((r) => r.attribute_code !== code))

  const openAdd = () => {
    setSelected(new Set())
    setAddOpen(true)
  }

  const toggleSelected = (code: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(code)
      } else {
        next.delete(code)
      }
      return next
    })

  const confirmAdd = () => {
    const toAdd = catalog.filter((a) => selected.has(a.code))
    setRows((prev) => [
      ...prev,
      ...toAdd.map((a) => ({
        attribute_code: a.code,
        name: a.name,
        unit: a.unit,
        group_code: a.group_code,
        is_required: false,
      })),
    ])
    setSelected(new Set())
    setAddOpen(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await adminFetch(`/admin/categories/${data.id}/spec-template`, {
        method: "POST",
        body: JSON.stringify({
          attributes: rows.map((r, i) => ({
            attribute_code: r.attribute_code,
            display_order: i,
            is_required: r.is_required,
          })),
        }),
      })
      toast.success("Spec template saved")
    } catch {
      toast.error("Failed to save spec template")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Spec Template</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Fields products in this category show, in this order. Drag to reorder.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={openAdd}
            disabled={availableToAdd.length === 0}
          >
            Add attributes
          </Button>
          <Button size="small" onClick={save} isLoading={saving}>
            Save Template
          </Button>
        </div>
      </div>

      {inherited.length > 0 ? (
        <div className="py-4">
          <div className="flex flex-col gap-1 px-6 pb-2">
            <Text
              size="small"
              leading="compact"
              weight="plus"
              className="text-ui-fg-muted uppercase"
            >
              Inherited from parent categories
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              These cascade down automatically — no need to re-add them.
            </Text>
          </div>
          {inherited.map((row) => (
            <div
              key={row.attribute_code}
              className={`${GRID} border-b border-ui-border-base py-2.5 last:border-b-0 opacity-70`}
            >
              <span />
              <Text size="small" leading="compact">
                {row.name}
                {row.unit ? (
                  <span className="text-ui-fg-subtle"> ({row.unit})</span>
                ) : null}
              </Text>
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle truncate"
              >
                {groupName(row.group)}
              </Text>
              {row.source_category ? (
                <Badge size="2xsmall" color="grey">
                  {row.source_category}
                </Badge>
              ) : (
                <span />
              )}
              <span />
            </div>
          ))}
        </div>
      ) : null}

      <div className="py-4">
        {rows.length === 0 ? (
          <Text size="small" className="px-6 text-ui-fg-subtle">
            No spec fields yet. Use “Add attributes” — products in this category
            will show exactly these fields, in this order.
          </Text>
        ) : (
          <>
            <div className={`${GRID} pb-2`}>
              <span />
              <Text
                size="xsmall"
                weight="plus"
                className="text-ui-fg-muted uppercase"
              >
                Attribute
              </Text>
              <Text
                size="xsmall"
                weight="plus"
                className="text-ui-fg-muted uppercase"
              >
                Group
              </Text>
              <Text
                size="xsmall"
                weight="plus"
                className="text-ui-fg-muted uppercase"
              >
                Required
              </Text>
              <span />
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={rows.map((r) => r.attribute_code)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((row) => (
                  <SpecTemplateRow
                    key={row.attribute_code}
                    row={row}
                    groupLabel={groupName(row.group_code)}
                    onToggleRequired={() => toggleRequired(row.attribute_code)}
                    onRemove={() => removeRow(row.attribute_code)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* Add attributes modal */}
      <FocusModal open={addOpen} onOpenChange={setAddOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button
              size="small"
              onClick={confirmAdd}
              disabled={selected.size === 0}
            >
              Add {selected.size || ""} attribute{selected.size === 1 ? "" : "s"}
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center py-8">
            <div className="flex w-full max-w-lg flex-col gap-3">
              <Heading level="h2">Add attributes</Heading>
              {availableToAdd.length === 0 ? (
                <Text size="small" className="text-ui-fg-subtle">
                  All catalog attributes are already in use or inherited.
                </Text>
              ) : (
                availableToAdd.map((a) => (
                  <Label
                    key={a.code}
                    size="small"
                    className="flex items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 hover:bg-ui-bg-base-hover"
                  >
                    <Checkbox
                      checked={selected.has(a.code)}
                      onCheckedChange={(v) => toggleSelected(a.code, !!v)}
                    />
                    <span className="flex flex-1 flex-col">
                      <span className="text-ui-fg-base">
                        {a.name}
                        {a.unit ? (
                          <span className="text-ui-fg-subtle"> ({a.unit})</span>
                        ) : null}
                      </span>
                      <span className="text-ui-fg-subtle">
                        {groupName(a.group_code)}
                      </span>
                    </span>
                  </Label>
                ))
              )}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategorySpecTemplateWidget
