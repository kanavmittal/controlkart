import type { Metadata } from "next"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { QueryProvider } from "@/components/providers/query-provider"
import { CartProvider } from "@/components/providers/cart-provider"
import { BASE_URL, STORE_NAME, STORE_TAGLINE } from "@/lib/config"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${STORE_NAME} - Selec PLCs & Industrial Automation Components`,
    template: `%s | ${STORE_NAME}`,
  },
  description: STORE_TAGLINE,
  openGraph: {
    siteName: STORE_NAME,
    type: "website",
    locale: "en_IN",
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
