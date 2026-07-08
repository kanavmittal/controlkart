import type { Metadata } from "next"
import "./globals.css"
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { SiteHeader } from "@/components/layout/site-header"
import { FooterFeatures } from "@/components/layout/footer-features"
import { SiteFooter } from "@/components/layout/site-footer"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { CartDrawerProvider } from "@/components/cart/cart-drawer-context"
import { QueryProvider } from "@/components/providers/query-provider"
import { CartProvider } from "@/components/providers/cart-provider"
import { QuickViewProvider } from "@/components/providers/quick-view-provider"
import { CompareProvider } from "@/components/product/compare-context"
import { CompareBar } from "@/components/product/compare-bar"
import { Toaster } from "@/components/ui/sonner"
import { BASE_URL, STORE_NAME, STORE_TAGLINE } from "@/lib/config"
import { getCategoryTree } from "@/lib/data/categories"

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Server-fetched once here and passed straight through to the desktop
  // mega-menu + mobile Sheet nav (both read-only consumers). Wrapped in
  // try/catch — a down backend (e.g. build-time ECONNREFUSED against static
  // generation) must not crash every route; the header/mobile-menu render
  // fine with an empty tree, they just show no category links.
  let categoryTree: Awaited<ReturnType<typeof getCategoryTree>> = []
  try {
    categoryTree = await getCategoryTree()
  } catch {
    categoryTree = []
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <CartProvider>
            <QuickViewProvider>
              <CompareProvider>
                <CartDrawerProvider>
                  <AnnouncementBar />
                  <SiteHeader categoryTree={categoryTree} />
                  <main className="flex-1">{children}</main>
                  <FooterFeatures />
                  <SiteFooter />
                  <CartDrawer />
                  <CompareBar />
                </CartDrawerProvider>
              </CompareProvider>
            </QuickViewProvider>
          </CartProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  )
}
