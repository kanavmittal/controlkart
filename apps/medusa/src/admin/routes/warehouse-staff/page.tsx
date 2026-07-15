import { defineRouteConfig } from "@medusajs/admin-sdk"
import { UserGroup } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Switch,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { adminFetch } from "../../lib/client"

type Staff = {
  id: string
  name: string
  email: string
  active: boolean
  created_at: string
}

type FormState = {
  name: string
  email: string
  password: string
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "" }

const WarehouseStaffPage = () => {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    adminFetch<{ staff: Staff[] }>("/admin/wms/staff")
      .then((res) => setStaff(res.staff))
      .catch(() => toast.error("Failed to load warehouse staff"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error(
        "Name and email are required, and password must be at least 8 characters"
      )
      return
    }
    setSaving(true)
    try {
      await adminFetch("/admin/wms/staff", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })
      toast.success("Staff account created")
      setModalOpen(false)
      setForm(EMPTY_FORM)
      refresh()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create staff account"
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (member: Staff) => {
    const nextActive = !member.active
    const confirmed = window.confirm(
      nextActive
        ? `Re-enable login for "${member.name}"?`
        : `Disable login for "${member.name}"? They will be logged out of the warehouse app immediately.`
    )
    if (!confirmed) return

    setTogglingId(member.id)
    try {
      await adminFetch(`/admin/wms/staff/${member.id}`, {
        method: "POST",
        body: JSON.stringify({ active: nextActive }),
      })
      toast.success(
        nextActive ? `${member.name} re-enabled` : `${member.name} disabled`
      )
      refresh()
    } catch {
      toast.error("Failed to update staff account")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Warehouse Staff</Heading>
        <Button size="small" onClick={openCreate}>
          Create staff
        </Button>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {staff.map((member) => (
              <Table.Row key={member.id}>
                <Table.Cell className="font-medium">{member.name}</Table.Cell>
                <Table.Cell>{member.email}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={member.active ? "green" : "grey"}>
                    {member.active ? "active" : "disabled"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-x-2">
                    <Text size="small" className="text-ui-fg-subtle">
                      {member.active ? "Enabled" : "Disabled"}
                    </Text>
                    <Switch
                      checked={member.active}
                      disabled={togglingId === member.id}
                      onCheckedChange={() => toggleActive(member)}
                    />
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {!loading && !staff.length && (
              <Table.Row>
                <Table.Cell className="text-ui-fg-subtle">
                  No warehouse staff yet. Create one to issue a login.
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      <FocusModal open={modalOpen} onOpenChange={setModalOpen}>
        <FocusModal.Content>
          <div className="flex h-full flex-col overflow-hidden">
            <FocusModal.Header>
              <div className="flex items-center justify-end gap-x-2">
                <FocusModal.Close asChild>
                  <Button size="small" variant="secondary" disabled={saving}>
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button size="small" onClick={save} isLoading={saving}>
                  Save
                </Button>
              </div>
            </FocusModal.Header>

            <FocusModal.Body className="flex-1 overflow-auto">
              <div className="mx-auto flex w-full max-w-lg flex-col gap-y-4 px-6 py-8">
                <Heading level="h2">Create staff</Heading>

                <div className="flex flex-col gap-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Asha Patel"
                  />
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="e.g. asha@warehouse.local"
                  />
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="At least 8 characters"
                  />
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    Share this with the staff member directly — it is not
                    emailed automatically.
                  </Text>
                </div>
              </div>
            </FocusModal.Body>
          </div>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Warehouse Staff",
  icon: UserGroup,
})

export default WarehouseStaffPage
