import type { ComponentType } from "react"
import Link from "next/link"
import { Briefcase, Camera, SquarePlay, Users, X, type LucideProps } from "lucide-react"

import { footer } from "@/config/site"
import type { SocialIconKey } from "@/config/types"

// lucide-react (installed version) ships no brand/logo icons (Facebook,
// Instagram, LinkedIn, YouTube, Twitter were all dropped upstream) — see
// plan note "Social icons: lucide equivalents." Nearest-shape/theme generic
// icons stand in: X's mark is literally an "X" glyph so the lucide `X`
// icon matches it directly; the rest are thematic (camera = photo-sharing,
// briefcase = professional network, play-square = video platform, users =
// community/social).
const socialIconMap: Record<SocialIconKey, ComponentType<LucideProps>> = {
  facebook: Users,
  instagram: Camera,
  linkedin: Briefcase,
  x: X,
  youtube: SquarePlay,
}

// Clone renders imported Visa/Mastercard/Amex/Paypal/DinersClub/Discover SVG
// wordmarks. ControlKart's actual payment rails are UPI/cards/net banking
// via Razorpay (see config `footer.paySecurely.text`) — rendered as simple
// bordered text badges instead of importing clone card-network SVGs, sized
// to match the clone row's visual weight (`h-6` icons, small gap).
const PAYMENT_METHODS = ["UPI", "Visa", "Mastercard", "RuPay", "Net Banking"] as const

// Clone ref: my-clone/src/components/SiteFooter.tsx. Dark (#232323 via
// `--color-athens-dark`) footer: logo/address block, link columns,
// pay-securely blurb, socials row, copyright + payment badges. Static
// config (config/site.ts `footer`) — no data fetching, stays a server
// component. No NewsletterBand — omitted storewide per plan decision #3.
export function SiteFooter() {
  return (
    <footer className="w-full bg-athens-dark">
      <div className="athens-container pt-14 pb-10">
        <div className="grid grid-cols-1 gap-5 text-[13px] leading-[20.8px] text-white/65 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="mb-4 inline-block text-xl font-bold tracking-tight text-white">
              {footer.logoText}
            </Link>
            <p>
              {footer.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p className="mt-5">
              {footer.hours.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>
          {footer.columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-4 text-[15px] font-medium text-white">{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label} className="leading-[26px]">
                    <Link href={link.href} className="text-white/65 hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="mb-4 text-[15px] font-medium text-white">{footer.paySecurely.title}</h2>
            <p>{footer.paySecurely.text}</p>
          </div>
        </div>
      </div>
      <div className="athens-container py-[18px]">
        <div className="flex items-center justify-center gap-3">
          {footer.socials.map(({ label, href, icon }) => {
            const Icon = socialIconMap[icon] ?? Users
            return (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex size-[38px] items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white"
              >
                <Icon className="size-[18px]" aria-hidden />
              </a>
            )
          })}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="athens-container flex flex-col items-center gap-3 py-[22px] md:flex-row md:justify-between">
          <p className="text-[13px] text-white/65">{footer.copyright}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
            {PAYMENT_METHODS.map((label) => (
              <span
                key={label}
                className="flex h-6 items-center rounded-[3px] border border-white/25 px-2 text-[10px] font-medium tracking-wide text-white/80"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
