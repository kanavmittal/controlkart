import type { Metadata } from "next"
import { OrderDetailView } from "./order-detail-view"

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false },
}

// User-specific page rendered client-side (CSR). The server shell only carries
// metadata; the UI + auth guard live in <OrderDetailView />.
export default function OrderDetailPage() {
  return <OrderDetailView />
}
