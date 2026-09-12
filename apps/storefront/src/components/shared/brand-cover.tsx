import Image from "next/image"
import type { StoreBrand } from "@/lib/data/brands"

export function BrandCover({ brand }: { brand: StoreBrand }) {
  return (
    <section className="athens-container mt-6" aria-label={`${brand.name} products`}>
      <div className="relative overflow-hidden rounded-lg bg-slate-950 px-6 py-10 text-white md:px-10 md:py-14">
        {brand.cover_url && <Image src={brand.cover_url} alt="" fill sizes="(min-width: 1400px) 1400px, 100vw" className="object-contain object-right" priority />}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/60 to-transparent" aria-hidden />
        <div className="relative max-w-lg">
          {brand.logo_url && <div className="mb-4 inline-flex rounded-md bg-white px-4 py-2"><Image src={brand.logo_url} alt={`${brand.name} logo`} width={140} height={52} className="h-10 w-auto object-contain" /></div>}
          <h2 className="text-3xl font-semibold text-white">{brand.name}</h2>
          {brand.description && <p className="mt-2 text-sm text-white/90">{brand.description}</p>}
        </div>
      </div>
    </section>
  )
}
