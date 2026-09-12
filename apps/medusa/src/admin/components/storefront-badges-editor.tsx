import { useEffect, useState } from "react"
import { Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { adminFetch } from "../lib/client"
import { parseBadgeSettings, type BadgeSettings, type StorefrontBadge } from "../../utils/storefront-badges"

export function StorefrontBadgesEditor({ id, kind }: { id: string; kind: "product" | "category" }) {
  const endpoint = `/admin/${kind === "product" ? "products" : "product-categories"}/${id}/badges`
  const [settings, setSettings] = useState<BadgeSettings>({ badges: [], show_sale_badge: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    adminFetch<BadgeSettings>(endpoint).then((value) => {
      if (!cancelled) setSettings(value)
    }).catch(() => {
      if (!cancelled) setError("Could not load badges. Retry before editing.")
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [endpoint, reload])

  const update = (index: number, change: Partial<StorefrontBadge>) => {
    setSettings((current) => ({ ...current, badges: current.badges.map((badge, i) => i === index ? { ...badge, ...change } : badge) }))
  }
  const save = async () => {
    try {
      const payload = parseBadgeSettings(settings)
      setSaving(true)
      const saved = await adminFetch<BadgeSettings>(endpoint, { method: "POST", body: JSON.stringify(payload) })
      setSettings(saved)
      toast.success("Storefront badges saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save badges")
    } finally { setSaving(false) }
  }
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2">Storefront badges</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {kind === "product" ? "Shown on product cards and product details." : "Shown on homepage promotions and category cards."}
          </Text>
        </div>
        <Button size="small" disabled={loading || !!error} isLoading={saving} onClick={save}>Save badges</Button>
      </div>
      <div className="space-y-4 px-6 py-4">
        {loading ? <Text>Loading badges…</Text> : error ? (
          <div><Text>{error}</Text><Button size="small" onClick={() => setReload((n) => n + 1)}>Retry</Button></div>
        ) : (
          <fieldset disabled={saving} className="space-y-4">
            {settings.badges.map((badge, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1 space-y-1">
                  <Label htmlFor={`${id}-badge-${index}`}>Badge {index + 1}</Label>
                  <Input id={`${id}-badge-${index}`} value={badge.label} maxLength={40} placeholder="New Arrival, 20% Off, Best Seller…" onChange={(event) => update(index, { label: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-tone-${index}`}>Color</Label>
                  <select id={`${id}-tone-${index}`} className="block rounded-md border px-3 py-1.5 text-sm" value={badge.tone} onChange={(event) => update(index, { tone: event.target.value as StorefrontBadge["tone"] })}>
                    <option value="new">Blue</option><option value="sale">Red</option><option value="custom">Dark</option>
                  </select>
                </div>
                <Button size="small" variant="secondary" aria-label={`Remove badge ${index + 1}`} onClick={() => setSettings((current) => ({ ...current, badges: current.badges.filter((_, i) => i !== index) }))}>Remove</Button>
              </div>
            ))}
            <Button size="small" variant="secondary" disabled={settings.badges.length >= 3} onClick={() => setSettings((current) => ({ ...current, badges: [...current.badges, { label: "", tone: "new" }] }))}>Add badge</Button>
            {kind === "product" && (
              <Label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.show_sale_badge} onChange={(event) => setSettings((current) => ({ ...current, show_sale_badge: event.target.checked }))} />
                Show automatic discount badge from product pricing
              </Label>
            )}
            <Text size="small" className="text-ui-fg-subtle">Up to 3 labels, 40 characters each. Remove all labels and save to hide them. Labels do not change prices; configure actual discounts in Medusa pricing. Saved changes appear after the storefront cache refreshes (about one minute).</Text>
          </fieldset>
        )}
      </div>
    </Container>
  )
}
