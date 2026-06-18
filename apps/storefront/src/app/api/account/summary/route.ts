import { NextResponse } from "next/server"
import { retrieveCart } from "@/lib/data/cart"
import { getCustomer } from "@/lib/data/auth"

// Reads cart/auth cookies server-side and returns a small summary for the
// client-side Header. Kept here (not in the page render path) so pages stay
// statically renderable for SEO.
export const dynamic = "force-dynamic"

export async function GET() {
  const [cart, customer] = await Promise.all([retrieveCart(), getCustomer()])
  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0

  return NextResponse.json(
    {
      itemCount,
      firstName: customer?.first_name ?? null,
      signedIn: !!customer,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
