import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  title: string
  actionLabel?: string | null
  actionHref?: string | null
  className?: string
  /** Custom right-side content (e.g. pill nav, arrows) rendered before the
   *  action link, matching clone `SectionHeading`. */
  children?: React.ReactNode
}

// Section headings row: `.athens-section-heading` title left, optional
// action link (styled as the Athens ghost button) right.
// Clone ref: my-clone/src/components/SectionHeading.tsx
export function SectionHeading({
  title,
  actionLabel,
  actionHref,
  className,
  children,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-5", className)}>
      <h2 className="athens-section-heading">{title}</h2>
      {children}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          data-icon="inline-end"
          className={cn(buttonVariants({ variant: "ghost" }), "shrink-0")}
        >
          {actionLabel}
          <ChevronRightIcon className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}
