export const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"

export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export const BASE_URL =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://controlkart.com").replace(/\/+$/, "")

export const STORE_NAME = "ControlKart"
/** Stable public identity; local download/auth URLs keep using BASE_URL. */
export const SEO_BASE_URL = "https://controlkart.com"
export const STORE_TAGLINE =
  "Authorized Selec distributor. Industrial automation components with pan-India shipping and GST invoicing."
