"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCompare } from "./compare-context"

export interface CompareCardCheckboxProps {
  productId: string
  className?: string
}

/**
 * Small labeled "Compare" checkbox meant to be embedded on `ProductCard` /
 * listing rows. Wiring it onto the actual card markup is a later
 * integration task (see T25 note in the plan) — this component only needs
 * `useCompare()`, so it works standalone today and will drop straight into
 * a card once that task lands. Renders/behaves the same with or without a
 * `CompareProvider` mounted (no-op fallback from `useCompare()`).
 */
export function CompareCardCheckbox({ productId, className }: CompareCardCheckboxProps) {
  const { isSelected, toggle } = useCompare()
  const checked = isSelected(productId)
  const inputId = `compare-${productId}`

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Checkbox
        id={inputId}
        checked={checked}
        onCheckedChange={() => toggle(productId)}
      />
      <Label
        htmlFor={inputId}
        className="cursor-pointer text-xs font-normal text-[var(--color-athens-body)]"
      >
        Compare
      </Label>
    </div>
  )
}
