import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false },
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="athens-container flex min-h-[60vh] flex-col items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="size-12 text-athens-success" aria-hidden />
          <div>
            <h1 className="athens-page-title">
              Order confirmed
            </h1>
            <p className="mt-2 font-mono text-xs text-athens-body">
              Order Ref: {id}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-athens-body">
            Thank you for your order. A confirmation with your GST invoice
            details will be emailed to you. Your order will be dispatched
            from our Mumbai warehouse within 24-48 hours.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/account/orders/${id}`}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              View order
            </Link>
            <Link
              href="/products"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Continue shopping
            </Link>
          </div>
          <Link
            href="/account"
            className="mt-1 text-xs text-athens-body underline-offset-4 hover:text-athens-dark hover:underline"
          >
            Go to your account
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
