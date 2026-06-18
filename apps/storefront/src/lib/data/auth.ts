"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { storeFetch } from "../medusa"
import {
  setAuthToken,
  removeAuthToken,
  authHeaders,
  getAuthToken,
} from "./cookies"
import { MEDUSA_BACKEND_URL, PUBLISHABLE_KEY } from "../config"

async function authRequest(path: string, body: Record<string, string>) {
  const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message ?? "Authentication failed")
  }
  return data as { token: string }
}

export async function getCustomer(): Promise<HttpTypes.StoreCustomer | null> {
  if (!(await getAuthToken())) return null
  try {
    const { customer } = await storeFetch<{
      customer: HttpTypes.StoreCustomer
    }>("/store/customers/me", {
      query: { fields: "id,email,first_name,last_name,phone,metadata" },
      headers: await authHeaders(),
      cache: "no-store",
    })
    return customer
  } catch {
    return null
  }
}

async function sendVerificationForCustomer(token: string) {
  const res = await fetch(`${MEDUSA_BACKEND_URL}/store/auth/send-verification`, {
    method: "POST",
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json() as Promise<{ sent: boolean; verify_url?: string }>
}

export async function signUp(
  _prev: { error: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const firstName = formData.get("first_name") as string
  const lastName = formData.get("last_name") as string
  const phone = (formData.get("phone") as string) || undefined

  try {
    const { token } = await authRequest("/auth/customer/emailpass/register", {
      email,
      password,
    })

    await fetch(`${MEDUSA_BACKEND_URL}/store/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        metadata: { email_verified: false },
      }),
      cache: "no-store",
    })

    const { token: loginToken } = await authRequest("/auth/customer/emailpass", {
      email,
      password,
    })
    await setAuthToken(loginToken)
    await sendVerificationForCustomer(loginToken)
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Registration failed" }
  }
  revalidatePath("/account")
  redirect("/account?verify=sent")
}

export async function signIn(
  _prev: { error: string } | undefined,
  formData: FormData
) {
  try {
    const { token } = await authRequest("/auth/customer/emailpass", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    })
    await setAuthToken(token)
  } catch {
    return { error: "Invalid email or password" }
  }
  revalidatePath("/account")
  redirect(formData.get("redirect")?.toString() || "/account")
}

export async function signOut() {
  await removeAuthToken()
  revalidatePath("/account")
  redirect("/")
}

export async function resendVerificationEmail(
  _prev:
    | {
        error?: string
        sent?: boolean
        verify_url?: string
        already_verified?: boolean
      }
    | undefined
) {
  const token = await getAuthToken()
  if (!token) {
    return { error: "You must be signed in." }
  }

  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/auth/send-verification`,
      {
        method: "POST",
        headers: {
          "x-publishable-api-key": PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    )
    const data = await res.json()
    if (!res.ok) {
      return { error: data.message ?? "Could not send verification email" }
    }
    revalidatePath("/account")
    revalidatePath("/checkout")
    revalidatePath("/cart")
    return {
      sent: data.sent,
      verify_url: data.verify_url,
      already_verified: data.already_verified,
    }
  } catch {
    return { error: "Could not send verification email" }
  }
}
