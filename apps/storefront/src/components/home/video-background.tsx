import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { videoBackground } from "@/config/home"

export function VideoBackground() {
  return (
    <section className="relative h-[520px] w-full overflow-hidden bg-[var(--color-athens-blue-light)] min-[750px]:h-[700px]">
      <Image
        className="object-cover"
        src={videoBackground.image}
        alt="Selec PLC, HMI and variable frequency drive"
        fill
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <h2 className="mb-3 text-[26px] font-medium text-white min-[750px]:text-[34px]">
          {videoBackground.heading}
        </h2>
        <p className="mb-6 text-[15px] text-white/90">{videoBackground.caption}</p>
        <Button render={<Link href={videoBackground.href} />}>
          {videoBackground.ctaLabel}
        </Button>
      </div>
    </section>
  )
}
