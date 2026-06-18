import crypto from "crypto"
import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export function buildVerifyUrl(token: string): string {
  const base =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000"
  return `${base}/verify-email?token=${token}`
}

export async function sendVerificationEmail(email: string, url: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "ControlKart <onboarding@resend.dev>",
        to: email,
        subject: "Verify your ControlKart account",
        html: `<p>Please verify your email to complete registration.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
      }),
    })
    return
  }
  console.log(`[ControlKart] Email verification for ${email}: ${url}`)
}

export async function issueVerificationEmail(
  container: MedusaContainer,
  customerId: string
) {
  const customerService = container.resolve(Modules.CUSTOMER)
  const customer = await customerService.retrieveCustomer(customerId)

  if (customer.metadata?.email_verified === true) {
    return { sent: false, already_verified: true as const }
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

  await customerService.updateCustomers(customer.id, {
    metadata: {
      ...customer.metadata,
      email_verified: false,
      verify_token: token,
      verify_expires: expires,
    },
  })

  const verifyUrl = buildVerifyUrl(token)
  await sendVerificationEmail(customer.email, verifyUrl)

  return {
    sent: true,
    verify_url: process.env.RESEND_API_KEY ? undefined : verifyUrl,
  }
}

export async function findCustomerByVerifyToken(
  container: MedusaContainer,
  token: string
) {
  const customerService = container.resolve(Modules.CUSTOMER)
  const customers = await customerService.listCustomers(
    { metadata: { verify_token: token } } as any,
    { take: 1 }
  )

  if (customers[0]) return customers[0]

  const all = await customerService.listCustomers({}, { take: 200 })
  return all.find((c) => c.metadata?.verify_token === token)
}
