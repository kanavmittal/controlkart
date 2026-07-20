// Offline GSTIN validation.
//
// There is no free, no-signup government/third-party API that returns a
// company's legal name from a GSTIN, so we don't call one. Instead we validate
// the number's structure AND its built-in check digit, which catches the vast
// majority of typos without any network call.
//
// A GSTIN is 15 chars: 2-digit state code + 10-char PAN + 1 entity digit +
// the literal "Z" + 1 checksum char. The checksum is a mod-36 weighted digit.

/** Structural pattern for a GSTIN (case-insensitive; normalize before storing). */
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/

// Valid GST state codes are 01–38 (plus 97 for "other territory", 99 for OIDAR).
const VALID_STATE_CODES = new Set([
  ...Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")),
  "97",
  "99",
])

const CODEPOINTS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** Recompute the GSTIN check digit (mod-36) and compare against the 15th char. */
function checksumValid(gstin: string): boolean {
  const factorAlt = [1, 2]
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const codePoint = CODEPOINTS.indexOf(gstin[i])
    if (codePoint < 0) return false
    const product = codePoint * factorAlt[i % 2]
    sum += Math.floor(product / CODEPOINTS.length) + (product % CODEPOINTS.length)
  }
  const checkChar =
    CODEPOINTS[(CODEPOINTS.length - (sum % CODEPOINTS.length)) % CODEPOINTS.length]
  return checkChar === gstin[14]
}

/** Uppercase + trim a raw GSTIN input. */
export function normalizeGstin(value: string): string {
  return value.trim().toUpperCase()
}

/**
 * True only when the value is a structurally valid GSTIN with a correct check
 * digit. Empty input is NOT valid here — callers decide whether GST is optional.
 */
export function isValidGstin(value: string): boolean {
  const gstin = normalizeGstin(value)
  if (gstin.length !== 15) return false
  if (!GSTIN_REGEX.test(gstin)) return false
  if (!VALID_STATE_CODES.has(gstin.slice(0, 2))) return false
  return checksumValid(gstin)
}
