/**
 * Tiny inline-SVG trend sparkline for a telemetry tile.
 *
 * Renders a normalized polyline + soft area fill over a fixed set of sample
 * points (a synthetic "approach to current value" trend, derived purely from
 * the goal's progress so it is deterministic and SSR-safe). Decorative.
 *
 * Shared primitive: used by both the /concepts Mission showcase and the
 * production dashboard. Fully prop-driven (color passed in), no token deps.
 */

type SparklineProps = {
  /** Sample series, any length >= 2; values are auto-normalized. */
  points: number[]
  /** CSS color expression for stroke/fill, e.g. "var(--chart-1)". */
  color: string
}

const WIDTH = 120
const HEIGHT = 30
const PAD = 2

export function Sparkline({ points, color }: SparklineProps) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = (WIDTH - PAD * 2) / (points.length - 1)

  const coords = points.map((value, index) => {
    const x = PAD + index * stepX
    const y = PAD + (HEIGHT - PAD * 2) * (1 - (value - min) / span)
    return { x, y }
  })

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT} L${coords[0].x.toFixed(1)},${HEIGHT} Z`
  const last = coords[coords.length - 1]

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
    >
      <path d={area} fill={color} fillOpacity={0.14} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r={1.8} fill={color} />
    </svg>
  )
}
