import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"
import { Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { adminFetch, adminUpload } from "../../lib/client"
import { parseBrandProfile, type BrandProfile, type DirectoryBrand } from "../../../utils/brand-directory"

const empty: BrandProfile = { name: "", description: "", logo_url: null, cover_url: null, enabled: true }
const BrandsPage = () => {
  const [brands, setBrands] = useState<DirectoryBrand[]>([])
  const [form, setForm] = useState<BrandProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const refresh = useCallback(async () => {
    setLoading(true)
    try { setBrands((await adminFetch<{ brands: DirectoryBrand[] }>("/admin/brands")).brands); setError("") }
    catch { setError("Could not load brands. Please retry.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const save = async () => {
    try {
      const payload = parseBrandProfile(form)
      setBusy(true)
      await adminFetch("/admin/brands", { method: "POST", body: JSON.stringify(payload) })
      toast.success("Brand saved")
      setForm(null)
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save brand") }
    finally { setBusy(false) }
  }
  const upload = async (file: File | undefined, field: "logo_url" | "cover_url") => {
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Choose a PNG, JPEG or WebP image under 5 MB"); return
    }
    setBusy(true)
    try {
      const result = await adminUpload([file])
      if (!result.files[0]?.url) throw new Error("Upload did not return an image URL")
      setForm((current) => current ? { ...current, [field]: result.files[0].url } : current)
    } catch { toast.error("Image upload failed") }
    finally { setBusy(false) }
  }
  return (
    <Container className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Heading level="h1">Brands</Heading><Text className="text-ui-fg-subtle">Manage the logos and cover images used across your storefront. Set brand names on products.</Text></div>
        {!form && <Button disabled={loading || !!error} onClick={() => { setEditing(false); setForm({ ...empty }) }}>Add brand</Button>}
      </div>
      {error && <div><Text>{error}</Text><Button onClick={refresh}>Retry</Button></div>}
      {form ? (
        <fieldset disabled={busy} className="space-y-4">
          <div><Label htmlFor="brand-name">Brand name</Label><Input id="brand-name" value={form.name} disabled={editing} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <Text size="small">Match the Brand field on your products. Only enabled brands with published products appear on the storefront.</Text>
          <div><Label htmlFor="brand-description">Description</Label><Textarea id="brand-description" value={form.description} maxLength={1000} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {(["logo_url", "cover_url"] as const).map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{field === "logo_url" ? "Logo" : "Cover image"}</Label>
              <Input id={field} value={form[field] ?? ""} placeholder="Upload an image or paste its URL" onChange={(e) => setForm({ ...form, [field]: e.target.value || null })} />
              <input aria-label={`Upload ${field === "logo_url" ? "logo" : "cover image"}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void upload(e.target.files?.[0], field); e.target.value = "" }} />
              {form[field] && <img src={form[field]!} alt={`${form.name} ${field === "logo_url" ? "logo" : "cover preview"}`} className="h-32 max-w-full rounded-md bg-ui-bg-subtle object-contain" />}
            </div>
          ))}
          <Label className="flex items-center gap-2"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />Show this brand on the storefront</Label>
          <Text size="small">Use the official logo and a wide cover showing this brand’s products. Changes appear after the storefront cache refreshes (about one minute).</Text>
          <div className="flex gap-2"><Button onClick={save} isLoading={busy}>Save brand</Button><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button></div>
        </fieldset>
      ) : loading ? <Text>Loading brands…</Text> : (
        <div className="divide-y">
          {brands.length === 0 && <Text>No brands yet. Add a brand or set the Brand field on a product.</Text>}
          {brands.map((brand) => (
            <div key={brand.name} className="flex items-center gap-4 py-4">
              {brand.logo_url && <img src={brand.logo_url} alt="" className="h-12 w-24 object-contain" />}
              <div className="flex-1"><Heading level="h2">{brand.name}</Heading><Text size="small">{brand.product_count} published products · {brand.enabled ? "Enabled" : "Hidden"}{!brand.logo_url ? " · Logo needed" : ""}{!brand.cover_url ? " · Cover needed" : ""}</Text></div>
              <Button variant="secondary" onClick={() => { setEditing(true); setForm(brand) }}>Edit</Button>
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}
export const config = defineRouteConfig({ label: "Brands", icon: Tag })
export default BrandsPage
