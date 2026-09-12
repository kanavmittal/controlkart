import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Tags } from "lucide-react"

import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { listBrands } from "@/lib/data/brands"

export const metadata: Metadata = {
  title: "Shop by Brand",
  description:
    "Browse Selec and the other industrial-automation brands ControlKart carries — PLCs, IO modules, displays, sensors and accessories by manufacturer.",
  alternates: { canonical: "/brands" },
}

export default async function BrandsPage() {
  const brands = await listBrands().catch(() => []);
  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Brands" }]} />
      <div className="athens-container py-10 md:py-14">
        <h1 className="athens-page-title">Shop by Brand</h1>

        {brands.length === 0 ? (
          <Empty className="mt-8 border border-dashed border-athens-line">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Tags />
              </EmptyMedia>
              <EmptyTitle>No brands yet</EmptyTitle>
              <EmptyDescription>
                Check back soon, or browse the full catalog instead.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => {
              const href = brand.href

              return (
                <div key={brand.name}>
                  <Link
                    href={href}
                    aria-label={brand.name}
                    className="group block overflow-hidden rounded-[var(--radius)] border border-border bg-white p-3 transition-colors hover:border-athens-dark"
                  >
                    <div className="relative aspect-[950/435] overflow-hidden rounded-[calc(var(--radius)-2px)] bg-athens-band">
                      {brand.cover_url || brand.logo_url ? <Image
                        src={(brand.cover_url || brand.logo_url)!}
                        alt={brand.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className={brand.cover_url ? "object-cover" : "object-contain p-5"}
                      /> : <span className="flex h-full items-center justify-center text-xl font-semibold">{brand.name}</span>}
                    </div>
                    {brand.logo_url && <Image src={brand.logo_url} alt={brand.name} width={160} height={60} className="mx-auto mt-3 h-12 object-contain" />}
                  </Link>
                  <p className="mt-3 text-center text-sm text-athens-body">
                    <Link href={href} className="hover:text-athens-dark hover:underline">
                      {brand.name}
                    </Link>
                  </p>
                  <p className="mt-1 text-center text-xs text-athens-body">{brand.product_count} products</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
