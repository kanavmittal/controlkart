import Link from "next/link"
import { listProducts } from "@/lib/data/products"
import { listCategories } from "@/lib/data/categories"
import { listPosts } from "@/lib/data/content"
import { ProductCard } from "@/components/products/product-card"
import { formatDate } from "@/lib/format"

// ISR: pre-rendered static HTML, revalidated for fresh data (strong SEO + CWV).
export const revalidate = 300

const TRUST_ITEMS = [
  { title: "Authorized Distribution", body: "Genuine Selec products sourced directly, with full manufacturer warranty." },
  { title: "Stock Transparency", body: "Live inventory on every product. What you see is what ships." },
  { title: "GST Invoicing", body: "GST-compliant invoice with every order. Add your GSTIN at checkout." },
  { title: "Pan-India Dispatch", body: "24-48 hr dispatch from our Mumbai warehouse to any pincode in India." },
]

const SHORTCUTS = [
  { href: "/quick-order", title: "Quick Order", body: "Enter SKUs and quantities directly. Built for repeat procurement." },
  { href: "/request-quote", title: "Request a Quote", body: "Bulk requirement? Get trade pricing within one working day." },
  { href: "/categories/plcs", title: "Browse PLCs", body: "Modular PLCs with flexible IO, Modbus RTU and Ethernet options." },
]

export default async function HomePage() {
  const [{ products }, categories, { posts }] = await Promise.all([
    listProducts({ limit: 8 }),
    listCategories(),
    listPosts({ limit: 3 }),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--color-line)]">
        <div className="shell grid gap-12 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="text-sm font-medium text-[var(--color-accent)]">
              Authorized Selec Controls Distributor
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Industrial automation components, stocked and shipped pan-India.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--color-ink-muted)]">
              Selec PLCs, IO modules and accessories with transparent stock,
              GST invoicing and dispatch within 48 hours. Built for OEMs,
              panel builders and maintenance teams.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/categories/plcs" className="btn-primary px-6 py-2.5">
                Browse PLCs
              </Link>
              <Link href="/quick-order" className="btn-secondary px-6 py-2.5">
                Quick Order by SKU
              </Link>
            </div>
          </div>
          <div className="hidden border border-[var(--color-line)] md:grid md:grid-cols-2">
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={item.title}
                className={`p-6 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-[var(--color-line)]`}
              >
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Procurement shortcuts */}
      <section className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)]">
        <div className="shell grid gap-px py-0 md:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group border-[var(--color-line)] p-8 md:border-r md:last:border-r-0"
            >
              <h3 className="text-base font-semibold group-hover:text-[var(--color-accent)]">
                {s.title} →
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {s.body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="shell py-20">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            Product Categories
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            View all products →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.handle}`}
              className="group bg-[var(--color-surface)] p-6 hover:bg-[var(--color-surface-alt)]"
            >
              <h3 className="text-sm font-semibold group-hover:text-[var(--color-accent)]">
                {cat.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-muted)]">
                {cat.description || "Browse range"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="shell pb-20">
        <h2 className="text-2xl font-bold tracking-tight">Featured Products</h2>
        <div className="mt-8 grid grid-cols-1 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Resources */}
      {posts.length > 0 && (
        <section className="border-t border-[var(--color-line)] bg-[var(--color-surface-alt)]">
          <div className="shell py-20">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                News & Guides
              </h2>
              <Link
                href="/resources"
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                All resources →
              </Link>
            </div>
            <div className="mt-8 grid gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/resources/${post.slug}`}
                  className="group bg-[var(--color-surface)] p-6"
                >
                  <div className="text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">
                    {post.type.replace("_", " ")} ·{" "}
                    {formatDate(post.published_at)}
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug group-hover:text-[var(--color-accent)]">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                    {post.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
