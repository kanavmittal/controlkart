/**
 * Pure-logic barcode template parser.
 *
 * A "template" describes how a supplier's barcode/label is laid out as a
 * delimiter-separated sequence of literal segments and placeholders. Only
 * two placeholders are supported: `{sku}` and `{serial}`, each usable at
 * most once per template.
 *
 * No Medusa / module / framework imports on purpose — this file must stay
 * a plain, dependency-free TypeScript library so it can be unit tested in
 * isolation and reused anywhere (admin config validation, scan-time
 * decoding, etc).
 */

/** Typed error codes produced by this module. */
export enum BarcodeTemplateErrorCode {
  /** The template string itself is malformed (bad placeholder, duplicates, etc) — a config-time error. */
  TEMPLATE_INVALID = "TEMPLATE_INVALID",
  /** The scanned string doesn't fit the (valid) template — segment count or literal mismatch. */
  SCAN_MISMATCH = "SCAN_MISMATCH",
  /** The scanned string was empty/blank. */
  EMPTY_SCAN = "EMPTY_SCAN",
}

/** Error type thrown by `parseScan` and `validateTemplate`. */
export class BarcodeTemplateError extends Error {
  readonly code: BarcodeTemplateErrorCode

  constructor(code: BarcodeTemplateErrorCode, message: string) {
    super(message)
    this.name = "BarcodeTemplateError"
    this.code = code
  }
}

export type BarcodeField = "sku" | "serial"

export type ParsedScan = {
  sku?: string
  serial?: string
}

type TemplateSegment =
  | { type: "literal"; value: string }
  | { type: "placeholder"; field: BarcodeField }

const PLACEHOLDER_PATTERN: Record<string, BarcodeField> = {
  "{sku}": "sku",
  "{serial}": "serial",
}

function hasDelimiter(delimiter: string | null): delimiter is string {
  return delimiter !== null && delimiter !== undefined && delimiter.length > 0
}

/**
 * Splits a template into literal/placeholder segments and validates the
 * structural rules. Throws `BarcodeTemplateError` (TEMPLATE_INVALID) on any
 * violation.
 */
function parseTemplateSegments(
  template: string,
  delimiter: string | null
): TemplateSegment[] {
  if (!template || template.length === 0) {
    throw new BarcodeTemplateError(
      BarcodeTemplateErrorCode.TEMPLATE_INVALID,
      "Template must be a non-empty string."
    )
  }

  const useDelimiter = hasDelimiter(delimiter)
  const rawSegments = useDelimiter ? template.split(delimiter) : [template]

  const segments: TemplateSegment[] = rawSegments.map((seg) => {
    if (seg in PLACEHOLDER_PATTERN) {
      return { type: "placeholder", field: PLACEHOLDER_PATTERN[seg] }
    }
    if (seg.includes("{") || seg.includes("}")) {
      throw new BarcodeTemplateError(
        BarcodeTemplateErrorCode.TEMPLATE_INVALID,
        `Unknown placeholder in template segment: "${seg}". Only {sku} and {serial} are supported.`
      )
    }
    return { type: "literal", value: seg }
  })

  const skuCount = segments.filter(
    (s) => s.type === "placeholder" && s.field === "sku"
  ).length
  const serialCount = segments.filter(
    (s) => s.type === "placeholder" && s.field === "serial"
  ).length

  if (skuCount > 1 || serialCount > 1) {
    throw new BarcodeTemplateError(
      BarcodeTemplateErrorCode.TEMPLATE_INVALID,
      "Each placeholder ({sku}, {serial}) may appear at most once in a template."
    )
  }

  if (skuCount === 0 && serialCount === 0) {
    throw new BarcodeTemplateError(
      BarcodeTemplateErrorCode.TEMPLATE_INVALID,
      "Template must contain at least one of {sku} or {serial}."
    )
  }

  if (!useDelimiter) {
    const isSinglePlaceholder =
      segments.length === 1 && segments[0].type === "placeholder"
    if (!isSinglePlaceholder) {
      throw new BarcodeTemplateError(
        BarcodeTemplateErrorCode.TEMPLATE_INVALID,
        "Templates without a delimiter must consist of exactly one placeholder ({sku} or {serial})."
      )
    }
  }

  return segments
}

/**
 * Admin-time validation of a supplier's template. Throws
 * `BarcodeTemplateError` (TEMPLATE_INVALID) if the template is malformed;
 * returns void if it's valid.
 */
export function validateTemplate(
  template: string,
  delimiter: string | null
): void {
  parseTemplateSegments(template, delimiter)
}

/**
 * Decodes a scanned string against a supplier's template.
 *
 * Throws `BarcodeTemplateError` with one of:
 * - EMPTY_SCAN: `raw` is empty/blank.
 * - TEMPLATE_INVALID: the template itself is malformed.
 * - SCAN_MISMATCH: segment count or literal segment mismatch.
 */
export function parseScan(
  template: string,
  delimiter: string | null,
  raw: string
): ParsedScan {
  if (!raw || raw.trim().length === 0) {
    throw new BarcodeTemplateError(
      BarcodeTemplateErrorCode.EMPTY_SCAN,
      "Scanned value is empty."
    )
  }

  const segments = parseTemplateSegments(template, delimiter)
  const useDelimiter = hasDelimiter(delimiter)

  if (!useDelimiter) {
    // parseTemplateSegments guarantees exactly one placeholder segment here.
    const field = (segments[0] as { type: "placeholder"; field: BarcodeField })
      .field
    return { [field]: raw }
  }

  const rawParts = raw.split(delimiter)
  const lastSegment = segments[segments.length - 1]
  const extra = rawParts.length - segments.length

  if (rawParts.length < segments.length) {
    throw new BarcodeTemplateError(
      BarcodeTemplateErrorCode.SCAN_MISMATCH,
      `Scan has ${rawParts.length} segment(s), template requires ${segments.length}.`
    )
  }

  if (extra > 0 && lastSegment.type !== "placeholder") {
    throw new BarcodeTemplateError(
      BarcodeTemplateErrorCode.SCAN_MISMATCH,
      `Scan has ${rawParts.length} segment(s), template only allows ${segments.length} (template does not end in a placeholder, so extra segments cannot be folded).`
    )
  }

  const result: ParsedScan = {}

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1
    // Tail-fold: the trailing placeholder absorbs every remaining raw
    // segment (rejoined with the delimiter) when the scan has more parts
    // than the template — some suppliers embed the delimiter inside serials.
    const value =
      isLast && extra > 0
        ? rawParts.slice(index).join(delimiter)
        : rawParts[index]

    if (segment.type === "literal") {
      if (value !== segment.value) {
        throw new BarcodeTemplateError(
          BarcodeTemplateErrorCode.SCAN_MISMATCH,
          `Expected literal "${segment.value}" at segment ${index}, got "${value}".`
        )
      }
    } else {
      result[segment.field] = value
    }
  })

  return result
}
