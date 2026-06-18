import { cn } from "@/lib/utils"

/**
 * SIGNATURE A — топографическая «местность» маршрута.
 *
 * Рукотворные концентрические горизонтали (как на топокарте): путь набирает
 * высоту к вершине = прогресс к цели. Чисто декоративный слой за текстом,
 * рисуется штрихом `var(--concept-contour)`. Никогда не конкурирует с контентом.
 */
export function ContourMap({ className }: { className?: string }) {
  // Несколько вложенных «холмов» со смещёнными центрами — рельеф, а не круги.
  const summits = [
    { cx: 150, cy: 120, rings: 7, step: 26, squash: 0.78 },
    { cx: 470, cy: 360, rings: 6, step: 30, squash: 0.7 },
    { cx: 300, cy: 560, rings: 5, step: 34, squash: 0.82 },
  ]

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
      viewBox="0 0 600 680"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <g stroke="var(--concept-contour)" strokeWidth={1.25}>
        {summits.map((summit, s) =>
          Array.from({ length: summit.rings }, (_, i) => {
            const r = summit.step * (i + 1)
            return (
              <ellipse
                key={`${s}-${i}`}
                cx={summit.cx}
                cy={summit.cy}
                rx={r}
                ry={r * summit.squash}
              />
            )
          }),
        )}
        {/* Вершинные отметки в центрах «холмов». */}
        {summits.map((summit, s) => (
          <circle
            key={`peak-${s}`}
            cx={summit.cx}
            cy={summit.cy}
            r={2.5}
            fill="var(--concept-ink)"
            stroke="none"
          />
        ))}
      </g>
    </svg>
  )
}
