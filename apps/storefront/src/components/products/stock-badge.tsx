export function StockBadge({ quantity }: { quantity: number | undefined }) {
  if (quantity === undefined) {
    return null
  }
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-bad)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-bad)]" />
        Out of stock
      </span>
    )
  }
  if (quantity <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-warn)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warn)]" />
        Low stock · {quantity} left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ok)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]" />
      In stock · {quantity} units
    </span>
  )
}
