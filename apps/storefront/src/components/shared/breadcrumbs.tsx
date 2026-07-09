import { Fragment } from "react"
import Link from "next/link"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  crumbs: Crumb[]
  className?: string
}

// Breadcrumbs bar under the sticky header: 50px, bottom hairline,
// "Home » Current page" — links in Athens blue, current crumb muted.
// Always starts with Home -> "/". Wraps the shadcn breadcrumb primitives
// (ui/breadcrumb.tsx) restyled to match the clone's visual.
// Clone ref: my-clone/src/components/Breadcrumbs.tsx
export function Breadcrumbs({ crumbs, className }: BreadcrumbsProps) {
  return (
    <div className={cn("border-b border-[var(--color-athens-line)] bg-background", className)}>
      <Breadcrumb className="athens-container">
        <BreadcrumbList className="h-[50px] flex-nowrap items-center text-[14px]">
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link href="/" />}
              className="text-[var(--color-athens-blue)] hover:underline"
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb) => (
            <Fragment key={crumb.label}>
              <BreadcrumbSeparator className="text-[#9b9b9b]">»</BreadcrumbSeparator>
              <BreadcrumbItem className="min-w-0">
                {crumb.href ? (
                  <BreadcrumbLink
                    render={<Link href={crumb.href} />}
                    className="text-[var(--color-athens-blue)] hover:underline"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate text-[var(--color-athens-body)]">
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
