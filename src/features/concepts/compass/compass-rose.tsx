import { useState } from "react"

import { useMountEffect } from "@/hooks/use-mount-effect"
import { cn } from "@/lib/utils"

/** One goal projected onto a ring segment of the compass rose. */
export type CompassArc = {
  id: string
  /** Short label rendered near the segment. */
  label: string
  /** 0..100 fill of this goal's allotted quadrant. */
  progress: number
  /** chart-N token index (1..5) for color coding. */
  chart: number
  /** Whether this segment is currently focused/selected. */
  active: boolean
}

type CompassRoseProps = {
  /** Mean progress across the goals, shown at the center. */
  overall: number
  arcs: CompassArc[]
  /** Optional callback when a segment is activated (keyboard/click). */
  onSelect?: (id: string) => void
  className?: string
}

const VIEWBOX = 320
const CENTER = VIEWBOX / 2
const RING_RADIUS = 124
/** A small gap (in degrees) between the four quadrant arcs. */
const GAP_DEG = 7
const QUADRANT_DEG = 90 - GAP_DEG

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  // 0deg points up (North); clockwise positive.
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

/** SVG arc-path string from startDeg to endDeg (clockwise) on the ring. */
function arcPath(startDeg: number, endDeg: number, radius: number) {
  const start = polar(CENTER, CENTER, radius, startDeg)
  const end = polar(CENTER, CENTER, radius, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

const CARDINALS = [
  { label: "С", deg: 0 },
  { label: "В", deg: 90 },
  { label: "Ю", deg: 180 },
  { label: "З", deg: 270 },
]

/**
 * Signature element of the Compass concept: a hand-authored radial dial.
 * Each goal owns one 90° quadrant; the colored arc fills that quadrant by the
 * goal's progress %. The needle and center reading show the overall bearing.
 * Arcs draw in on mount.
 */
export function CompassRose({ overall, arcs, onSelect, className }: CompassRoseProps) {
  const [drawn, setDrawn] = useState(false)
  useMountEffect(() => {
    const id = globalThis.requestAnimationFrame(() => setDrawn(true))
    return () => globalThis.cancelAnimationFrame(id)
  })

  // Quadrant start angles: N, E, S, W (each 90° wide).
  const quadrantStart = [0, 90, 180, 270]
  // Needle points to the overall bearing around the full circle.
  const needle = polar(CENTER, CENTER, RING_RADIUS - 22, (overall / 100) * 360)

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={cn("h-auto w-full max-w-[min(82vw,460px)]", className)}
      role="img"
      aria-label={`Компас целей: общий курс ${overall} процентов`}
    >
      <defs>
        <radialGradient id="compass-face" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="var(--card)" />
          <stop offset="100%" stopColor="var(--secondary)" />
        </radialGradient>
      </defs>

      {/* Face + outer ring (decorative). */}
      <g aria-hidden>
        <circle cx={CENTER} cy={CENTER} r={RING_RADIUS + 22} fill="url(#compass-face)" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS + 22}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1.5}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />

        {/* Cardinal-style tick marks (72 minor + 4 major). */}
        {Array.from({ length: 72 }, (_, i) => {
          const deg = i * 5
          const major = deg % 90 === 0
          const mid = !major && deg % 45 === 0
          const inner = RING_RADIUS - (major ? 16 : mid ? 11 : 6)
          const a = polar(CENTER, CENTER, RING_RADIUS, deg)
          const b = polar(CENTER, CENTER, inner, deg)
          return (
            <line
              key={deg}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--concept-grid)"
              strokeWidth={major ? 1.6 : 1}
              opacity={major ? 0.9 : mid ? 0.6 : 0.4}
            />
          )
        })}

        {/* Cardinal letters. */}
        {CARDINALS.map(({ label, deg }) => {
          const p = polar(CENTER, CENTER, RING_RADIUS + 11, deg)
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="concept-mono"
              fontSize={11}
              fill="var(--muted-foreground)"
            >
              {label}
            </text>
          )
        })}
      </g>

      {/* Goal arcs — the four bearings. */}
      {arcs.map((arc, index) => {
        const start = quadrantStart[index] + GAP_DEG / 2
        const sweep = (Math.max(0, Math.min(100, arc.progress)) / 100) * QUADRANT_DEG
        const track = arcPath(start, start + QUADRANT_DEG, RING_RADIUS)
        const fill = arcPath(start, start + Math.max(sweep, 0.001), RING_RADIUS)
        const color = `var(--chart-${arc.chart})`
        // dashoffset draws the colored arc in on mount.
        const len = (Math.PI / 180) * sweep * RING_RADIUS

        return (
          <g key={arc.id}>
            <path
              d={track}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={arc.active ? 10 : 8}
              strokeLinecap="round"
              opacity={0.7}
            />
            <path
              d={fill}
              fill="none"
              stroke={color}
              strokeWidth={arc.active ? 12 : 9}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={drawn ? 0 : len}
              className="[transition:stroke-dashoffset_900ms_cubic-bezier(0.22,1,0.36,1),stroke-width_200ms_ease]"
              style={{ transitionDelay: `${index * 110}ms` }}
            />
          </g>
        )
      })}

      {/* Needle + hub (decorative; data is read out in text). */}
      <g
        aria-hidden
        className={cn(
          "origin-center [transition:opacity_700ms_ease] [transition-delay:560ms]",
          drawn ? "opacity-100" : "opacity-0",
        )}
      >
        <line
          x1={CENTER}
          y1={CENTER}
          x2={needle.x}
          y2={needle.y}
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CENTER} cy={CENTER} r={5} fill="var(--accent)" />
      </g>

      {/* Center reading. */}
      <text
        x={CENTER}
        y={CENTER - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="concept-mono"
        fontSize={11}
        letterSpacing={2}
        fill="var(--muted-foreground)"
      >
        ОБЩИЙ КУРС
      </text>
      <text
        x={CENTER}
        y={CENTER + 20}
        textAnchor="middle"
        dominantBaseline="central"
        className="concept-display concept-tnum"
        fontSize={46}
        fontWeight={700}
        letterSpacing={-1}
        fill="var(--primary)"
      >
        {overall}%
      </text>

      {/* Invisible per-quadrant hit targets for selecting a goal. */}
      {onSelect &&
        arcs.map((arc, index) => {
          const start = quadrantStart[index] + GAP_DEG / 2
          const a = polar(CENTER, CENTER, RING_RADIUS + 22, start)
          const b = polar(CENTER, CENTER, RING_RADIUS + 22, start + QUADRANT_DEG)
          const inner = polar(CENTER, CENTER, RING_RADIUS - 30, start + QUADRANT_DEG)
          const innerStart = polar(CENTER, CENTER, RING_RADIUS - 30, start)
          const d = [
            `M ${a.x} ${a.y}`,
            `A ${RING_RADIUS + 22} ${RING_RADIUS + 22} 0 0 1 ${b.x} ${b.y}`,
            `L ${inner.x} ${inner.y}`,
            `A ${RING_RADIUS - 30} ${RING_RADIUS - 30} 0 0 0 ${innerStart.x} ${innerStart.y}`,
            "Z",
          ].join(" ")
          return (
            <path
              key={`hit-${arc.id}`}
              d={d}
              fill="transparent"
              className="cursor-pointer outline-none focus-visible:fill-[var(--ring)]/10 focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:2]"
              tabIndex={0}
              role="button"
              aria-label={`${arc.label}: курс ${arc.progress} процентов`}
              aria-pressed={arc.active}
              onClick={() => onSelect(arc.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onSelect(arc.id)
                }
              }}
            />
          )
        })}
    </svg>
  )
}
