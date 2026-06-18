import type { SpecValueDTO } from "@/lib/data/types"

/** Border-based, grouped technical specification table. */
export function SpecTable({ specs }: { specs: SpecValueDTO[] }) {
  if (!specs.length) {
    return null
  }

  const groups = specs.reduce<Record<string, SpecValueDTO[]>>((acc, spec) => {
    ;(acc[spec.group] ??= []).push(spec)
    return acc
  }, {})

  return (
    <div className="border border-[var(--color-line)]">
      {Object.entries(groups).map(([group, rows]) => (
        <div key={group}>
          <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            {group}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((spec) => (
                <tr
                  key={spec.id}
                  className="border-b border-[var(--color-line)] last:border-b-0"
                >
                  <td className="w-1/3 px-4 py-2.5 align-top font-medium">
                    {spec.attribute}
                  </td>
                  <td className="px-4 py-2.5 align-top text-[var(--color-ink-muted)]">
                    {spec.value}
                    {spec.unit ? ` ${spec.unit}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
