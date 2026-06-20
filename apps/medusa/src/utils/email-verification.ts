import crypto from "crypto"
import { Modules } from "@medusajs/framework/utils"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export function buildVerifyUrl(token: string): string {
  const base =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000"
  return `${base}/verify-email?token=${token}`
}

type CustomerService = {
  updateCustomers: (
    id: string,
    data: { metadata: Record<string, unknown> }
  ) => Promise<unknown>
  listCustomers: (
    filters?: Record<string, unknown>,
    config?: { take?: number }
  ) => Promise<
    Array<{
      id: string
      email: string
      metadata?: Record<string, unknown> | null
    }>
  >
}

export async function issueVerificationToken(
  customerService: CustomerService,
  customerId: string,
  existingMetadata: Record<string, unknown> = {}
) {
  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

  await customerService.updateCustomers(customerId, {
    metadata: {
      ...existingMetadata,
      email_verified: false,
      verify_token: token,
      verify_expires: expires,
    },
  })

  return token
}

export async function findCustomerByVerifyToken(
  customerService: CustomerService,
  token: string
) {
  const customers = await customerService.listCustomers(
    { metadata: { verify_token: token } } as Record<string, unknown>,
    { take: 1 }
  )

  if (customers[0]) return customers[0]

  const all = await customerService.listCustomers({}, { take: 200 })
  return all.find((c) => c.metadata?.verify_token === token)
}

export { TOKEN_TTL_MS }
