/** Formats an amount (major units) as Indian Rupees, e.g. ₹16,609. */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "—"
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}
