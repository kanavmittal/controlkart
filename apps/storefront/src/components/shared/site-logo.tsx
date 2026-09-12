import Image from "next/image"

/** Approved ControlKart artwork, framed to remove its presentation margins. */
export function SiteLogo() {
  return (
    <span className="relative block h-10 w-[180px] overflow-hidden rounded bg-white">
      <Image
        src="/branding/controlkart-logo.png"
        alt="ControlKart"
        width={2172}
        height={724}
        sizes="210px"
        priority
        className="absolute left-1/2 top-1/2 h-auto w-[210px] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
    </span>
  )
}
