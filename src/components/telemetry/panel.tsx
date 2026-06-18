import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Titled instrument-panel section frame (icon header + optional meta + body).
 * Shared primitive for the Mission Control instrument-panel look.
 */
export function Panel({
  title,
  icon: Icon,
  meta,
  children,
  className,
}: {
  title: string
  icon: LucideIcon
  meta?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col border border-border bg-card", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border bg-popover/40 px-4 py-2.5">
        <h2 className="concept-display flex items-center gap-2 text-sm tracking-[0.16em] text-foreground uppercase">
          <Icon aria-hidden className="size-4 text-primary" />
          {title}
        </h2>
        {meta ? (
          <span className="concept-tnum text-[10px] tracking-wider text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}
