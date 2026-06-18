import { cn } from "@/lib/utils"

/**
 * Fleet-banner stat readout: uppercase label + big tabular value + optional unit.
 * Shared primitive for the Mission Control instrument-panel look.
 */
export function StatBlock({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: number | string
  unit?: string
  accent?: boolean
}) {
  return (
    <div className="flex min-w-[88px] flex-col gap-1 px-4 first:pl-0">
      <span className="concept-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "concept-display concept-tnum text-2xl leading-none font-semibold",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-0.5 text-sm text-muted-foreground">{unit}</span>
        ) : null}
      </span>
    </div>
  )
}
