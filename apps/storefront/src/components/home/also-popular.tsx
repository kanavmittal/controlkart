import { getCategoryBadges } from "@/lib/data/category-badges"
import { ProductBadges } from "@/components/shared/product-badges"
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { getCategoryImage } from "@/config/category-images";
import type { StoreCategory } from "@/lib/data/categories";

// "Also popular" category links grid.
export async function AlsoPopular({ categories }: { categories: StoreCategory[] }) {
  if (!categories.length) return null;
  const byId = new Map(categories.map((category) => [category.id, category]));
  const items = categories.map((category) => ({
    title: category.name,
    href: `/categories/${category.handle}`,
    // Keep every category visually scannable, even when a newly-created
    // Medusa category has not received dedicated photography yet.
    image: getCategoryImage(category.handle, byId.get(category.parent_category_id ?? "")?.handle) ?? "/marketing/selec/automation-hero.jpg",
  }));
  const badges = await getCategoryBadges()
  return (
    <section className="athens-container my-10 md:my-[60px]">
      <SectionHeading title="Shop by category" actionLabel="All categories" actionHref="/categories" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-[5px] bg-white shadow-[inset_0_0_0_1px_#dfdfdf] transition-shadow duration-200 hover:shadow-[inset_0_0_0_1px_#232323]"
          >
            <div className="relative h-[128px] w-full shrink-0 bg-[#f5f6f7]">
            <Image
              src={item.image}
              alt={item.title}
              fill
              loading="lazy"
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
              className="object-contain p-3 transition-transform duration-200 group-hover:scale-105"
            />
            </div>
            <span className="flex flex-1 items-center px-4 py-3 text-[15px] leading-tight text-[#232323]">
              {item.title}
              <ProductBadges badges={badges[item.href] ?? []} className="my-1" />
            </span>
            <ChevronRight className="absolute bottom-4 right-3 size-4 shrink-0 text-[#676767]" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
