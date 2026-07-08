import type { ComponentType } from "react"
import { Globe, Phone, RotateCcw, ShieldCheck, type LucideProps } from "lucide-react"

import { footerFeatures } from "@/config/site"
import type { FooterFeatureIconKey } from "@/config/types"

// icon key -> lucide icon. Clone maps to custom outline SVGs (world / phone /
// returns / star); ControlKart drops the ratings "star" chip (decision #2)
// in favor of a "shield" (GST invoicing) chip, mapped to ShieldCheck here.
const iconMap: Record<FooterFeatureIconKey, ComponentType<LucideProps>> = {
  world: Globe,
  phone: Phone,
  returns: RotateCcw,
  shield: ShieldCheck,
}

// Clone ref: my-clone/src/components/FooterFeatures.tsx
// 4 trust chips band, rendered between the main content and the dark
// SiteFooter. Static config (config/site.ts `footerFeatures`) — no data
// fetching, so this stays a server component.
export function FooterFeatures() {
  return (
    <section className="bg-athens-band py-6">
      <div className="athens-container grid grid-cols-1 gap-5 min-[750px]:grid-cols-2 min-[990px]:grid-cols-4">
        {footerFeatures.map((feature) => {
          const Icon = iconMap[feature.icon] ?? Globe
          return (
            <div
              key={feature.title}
              className="flex min-h-[84px] items-center gap-4 rounded-[5px] bg-white px-[22px] py-[18px] shadow-[inset_0_0_0_1px_var(--color-athens-line)]"
            >
              <Icon className="size-[26px] shrink-0 text-athens-blue" aria-hidden />
              <div className="flex flex-col">
                <p className="text-[15px] font-medium text-athens-blue">{feature.title}</p>
                <p className="text-[13px] leading-[20.8px] text-athens-body">{feature.caption}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
