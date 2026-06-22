/**
 * Parses the `specs` URL param used by spec facet filtering.
 * Shape: JSON object mapping an attribute code to its selected exact values,
 * e.g. `{"mounting_type":["DIN Rail"],"certification":["CE, RoHS"]}`.
 */
export function parseSpecParam(raw?: string): Record<string, string[]> {
  if (!raw) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return {}
    }
    const out: Record<string, string[]> = {}
    for (const [code, vals] of Object.entries(parsed)) {
      if (Array.isArray(vals)) {
        out[code] = vals.filter((v): v is string => typeof v === "string")
      }
    }
    return out
  } catch {
    return {}
  }
}
