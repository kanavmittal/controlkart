import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Select,
  Checkbox,
  Table,
  Text,
  FocusModal,
  Drawer,
  IconButton,
  toast,
} from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { adminFetch } from "../../lib/client"

type Group = {
  id: string
  name: string
  code: string
  display_order: number
}

type Attribute = {
  id: string
  name: string
  code: string
  group_code: string
  unit: string | null
  display_order: number
  is_filterable: boolean
  is_comparable: boolean
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

/* ----------------------------- Group form ----------------------------- */

type GroupDraft = { name: string; code: string; display_order: number }

const emptyGroup: GroupDraft = { name: "", code: "", display_order: 0 }

function GroupForm({
  draft,
  onChange,
}: {
  draft: GroupDraft
  onChange: (d: GroupDraft) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label size="small">Name</Label>
        <Input
          value={draft.name}
          onChange={(e) =>
            onChange({
              ...draft,
              name: e.target.value,
              code: draft.code || slugify(e.target.value),
            })
          }
          placeholder="Electrical"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label size="small">Code</Label>
        <Input
          value={draft.code}
          onChange={(e) => onChange({ ...draft, code: slugify(e.target.value) })}
          placeholder="electrical"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label size="small">Display order</Label>
        <Input
          type="number"
          value={draft.display_order}
          onChange={(e) =>
            onChange({ ...draft, display_order: Number(e.target.value) || 0 })
          }
        />
      </div>
    </div>
  )
}

/* --------------------------- Attribute form --------------------------- */

type AttributeDraft = {
  name: string
  code: string
  group_code: string
  unit: string
  display_order: number
  is_filterable: boolean
  is_comparable: boolean
}

const emptyAttribute: AttributeDraft = {
  name: "",
  code: "",
  group_code: "general",
  unit: "",
  display_order: 0,
  is_filterable: false,
  is_comparable: true,
}

function AttributeForm({
  draft,
  groups,
  onChange,
}: {
  draft: AttributeDraft
  groups: Group[]
  onChange: (d: AttributeDraft) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label size="small">Name</Label>
        <Input
          value={draft.name}
          onChange={(e) =>
            onChange({
              ...draft,
              name: e.target.value,
              code: draft.code || slugify(e.target.value),
            })
          }
          placeholder="Supply Voltage"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label size="small">Code</Label>
        <Input
          value={draft.code}
          onChange={(e) => onChange({ ...draft, code: slugify(e.target.value) })}
          placeholder="supply_voltage"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label size="small">Group</Label>
        <Select
          value={draft.group_code}
          onValueChange={(v) => onChange({ ...draft, group_code: v })}
        >
          <Select.Trigger>
            <Select.Value placeholder="Select a group…" />
          </Select.Trigger>
          <Select.Content>
            {groups.map((g) => (
              <Select.Item key={g.code} value={g.code}>
                {g.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label size="small">Unit (optional)</Label>
        <Input
          value={draft.unit}
          onChange={(e) => onChange({ ...draft, unit: e.target.value })}
          placeholder="mm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label size="small">Display order</Label>
        <Input
          type="number"
          value={draft.display_order}
          onChange={(e) =>
            onChange({ ...draft, display_order: Number(e.target.value) || 0 })
          }
        />
      </div>
      <Label size="small" className="flex items-center gap-2">
        <Checkbox
          checked={draft.is_filterable}
          onCheckedChange={(v) => onChange({ ...draft, is_filterable: !!v })}
        />
        Filterable on storefront
      </Label>
      <Label size="small" className="flex items-center gap-2">
        <Checkbox
          checked={draft.is_comparable}
          onCheckedChange={(v) => onChange({ ...draft, is_comparable: !!v })}
        />
        Comparable
      </Label>
    </div>
  )
}

/* ------------------------------- Page -------------------------------- */

const SpecCatalogPage = () => {
  const [groups, setGroups] = useState<Group[]>([])
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading] = useState(true)

  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(emptyGroup)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  const [attrModalOpen, setAttrModalOpen] = useState(false)
  const [attrDraft, setAttrDraft] = useState<AttributeDraft>(emptyAttribute)
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null)

  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      adminFetch<{ groups: Group[] }>("/admin/specs/groups"),
      adminFetch<{ attributes: Attribute[] }>("/admin/specs/attributes"),
    ])
      .then(([g, a]) => {
        setGroups(g.groups)
        setAttributes(a.attributes)
      })
      .catch(() => toast.error("Failed to load spec catalog"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const groupName = (code: string) =>
    groups.find((g) => g.code === code)?.name ?? code

  /* ---- group actions ---- */
  const openNewGroup = () => {
    setEditingGroup(null)
    setGroupDraft(emptyGroup)
    setGroupModalOpen(true)
  }
  const openEditGroup = (g: Group) => {
    setEditingGroup(g)
    setGroupDraft({
      name: g.name,
      code: g.code,
      display_order: g.display_order,
    })
    setGroupModalOpen(true)
  }
  const saveGroup = async () => {
    if (!groupDraft.name || !groupDraft.code) {
      toast.error("Name and code are required")
      return
    }
    setBusy(true)
    try {
      await adminFetch(
        editingGroup
          ? `/admin/specs/groups/${editingGroup.id}`
          : "/admin/specs/groups",
        { method: "POST", body: JSON.stringify(groupDraft) }
      )
      toast.success(editingGroup ? "Group updated" : "Group created")
      setGroupModalOpen(false)
      load()
    } catch {
      toast.error("Failed to save group")
    } finally {
      setBusy(false)
    }
  }
  const deleteGroup = async (g: Group) => {
    setBusy(true)
    try {
      await adminFetch(`/admin/specs/groups/${g.id}`, { method: "DELETE" })
      toast.success("Group deleted")
      load()
    } catch {
      toast.error("Failed to delete group")
    } finally {
      setBusy(false)
    }
  }

  /* ---- attribute actions ---- */
  const openNewAttr = () => {
    setEditingAttr(null)
    setAttrDraft({
      ...emptyAttribute,
      group_code: groups[0]?.code ?? "general",
    })
    setAttrModalOpen(true)
  }
  const openEditAttr = (a: Attribute) => {
    setEditingAttr(a)
    setAttrDraft({
      name: a.name,
      code: a.code,
      group_code: a.group_code,
      unit: a.unit ?? "",
      display_order: a.display_order,
      is_filterable: a.is_filterable,
      is_comparable: a.is_comparable,
    })
    setAttrModalOpen(true)
  }
  const saveAttr = async () => {
    if (!attrDraft.name || !attrDraft.code) {
      toast.error("Name and code are required")
      return
    }
    setBusy(true)
    try {
      const body = { ...attrDraft, unit: attrDraft.unit || null }
      await adminFetch(
        editingAttr
          ? `/admin/specs/attributes/${editingAttr.id}`
          : "/admin/specs/attributes",
        { method: "POST", body: JSON.stringify(body) }
      )
      toast.success(editingAttr ? "Attribute updated" : "Attribute created")
      setAttrModalOpen(false)
      load()
    } catch {
      toast.error("Failed to save attribute")
    } finally {
      setBusy(false)
    }
  }
  const deleteAttr = async (a: Attribute) => {
    setBusy(true)
    try {
      await adminFetch(`/admin/specs/attributes/${a.id}`, { method: "DELETE" })
      toast.success("Attribute deleted")
      load()
    } catch {
      toast.error("Failed to delete attribute")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Groups */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Spec Groups</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Logical sections that attributes are grouped under.
            </Text>
          </div>
          <Button size="small" variant="secondary" onClick={openNewGroup}>
            Create Group
          </Button>
        </div>
        <div className="px-6 py-2">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Code</Table.HeaderCell>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.map((g) => (
                <Table.Row key={g.id}>
                  <Table.Cell>{g.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{g.code}</Table.Cell>
                  <Table.Cell>{g.display_order}</Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        variant="transparent"
                        onClick={() => openEditGroup(g)}
                      >
                        Edit
                      </Button>
                      <IconButton
                        size="small"
                        variant="transparent"
                        disabled={busy}
                        onClick={() => deleteGroup(g)}
                      >
                        <Trash />
                      </IconButton>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Container>

      {/* Attributes */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Spec Attributes</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Reusable spec fields. Assign them to categories from each
              category&rsquo;s page.
            </Text>
          </div>
          <Button size="small" variant="secondary" onClick={openNewAttr}>
            Create Attribute
          </Button>
        </div>
        <div className="px-6 py-2">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Code</Table.HeaderCell>
                <Table.HeaderCell>Group</Table.HeaderCell>
                <Table.HeaderCell>Unit</Table.HeaderCell>
                <Table.HeaderCell>Filterable</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {attributes.map((a) => (
                <Table.Row key={a.id}>
                  <Table.Cell>{a.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{a.code}</Table.Cell>
                  <Table.Cell>{groupName(a.group_code)}</Table.Cell>
                  <Table.Cell>{a.unit ?? "—"}</Table.Cell>
                  <Table.Cell>{a.is_filterable ? "Yes" : "No"}</Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        variant="transparent"
                        onClick={() => openEditAttr(a)}
                      >
                        Edit
                      </Button>
                      <IconButton
                        size="small"
                        variant="transparent"
                        disabled={busy}
                        onClick={() => deleteAttr(a)}
                      >
                        <Trash />
                      </IconButton>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Container>

      {/* Group create/edit modal */}
      <FocusModal open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button size="small" onClick={saveGroup} isLoading={busy}>
              {editingGroup ? "Save changes" : "Create group"}
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center py-8">
            <div className="w-full max-w-lg">
              <Heading level="h2" className="mb-4">
                {editingGroup ? "Edit group" : "New group"}
              </Heading>
              <GroupForm draft={groupDraft} onChange={setGroupDraft} />
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Attribute create/edit drawer */}
      <Drawer open={attrModalOpen} onOpenChange={setAttrModalOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {editingAttr ? "Edit attribute" : "New attribute"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto">
            <AttributeForm
              draft={attrDraft}
              groups={groups}
              onChange={setAttrDraft}
            />
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">
                Cancel
              </Button>
            </Drawer.Close>
            <Button size="small" onClick={saveAttr} isLoading={busy}>
              {editingAttr ? "Save changes" : "Create attribute"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Spec Catalog",
  icon: Tag,
})

export default SpecCatalogPage
