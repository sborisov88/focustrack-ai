import { animate, motion, useMotionValue, useTransform } from "motion/react"

import { useMountEffect } from "@/hooks/use-mount-effect"

/**
 * Hand-authored radial telemetry gauge for a single goal tile.
 *
 * Draws a ~270° instrument arc: a dim track plus a glowing progress sweep
 * colored by the goal's chart-N hue. Motion drives the reveal — the sweep
 * grows from empty to the target, the center number counts up, and the
 * endpoint dot fades in — all offset by `delay` for a staggered wave across
 * tiles. Re-animates when `value` changes.
 *
 * Shared primitive: used by both the /concepts Mission showcase and the
 * production dashboard. Relies on global tokens `--concept-grid`, `--chart-N`,
 * `--muted-foreground` and the `concept-display`/`concept-tnum` helper classes.
 */

type TelemetryArcProps = {
  /** 0..100 progress percentage. */
  value: number
  /** CSS color expression, e.g. "var(--chart-1)". */
  color: string
  /** Animation start delay in seconds (for per-tile stagger). */
  delay?: number
}

const SIZE = 132
const STROKE = 9
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
/** Sweep spans 270° (gap at the bottom, like an analog dial). */
const SWEEP_DEG = 270
const GAP_DEG = 360 - SWEEP_DEG
const CIRC = 2 * Math.PI * RADIUS
const TRACK_LEN = (CIRC * SWEEP_DEG) / 360
const TICK_COUNT = 9
const DURATION = 0.9
const EASE = [0.22, 1, 0.36, 1] as const

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

export function TelemetryArc({ value, color, delay = 0 }: TelemetryArcProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const progressLen = (TRACK_LEN * clamped) / 100
  // Rotate so the gap sits at the bottom: start the arc at GAP/2 past 180°.
  const rotation = 90 + GAP_DEG / 2
  const startAngle = GAP_DEG / 2
  const endAngle = GAP_DEG / 2 + SWEEP_DEG

  // Center number counts up from 0 to the value.
  const count = useMotionValue(0)
  const display = useTransform(count, (v) => Math.round(v))
  useMountEffect(() => {
    const controls = animate(count, clamped, { delay, duration: DURATION, ease: EASE })
    return () => controls.stop()
  })

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-[112px] w-[112px] shrink-0 sm:h-[124px] sm:w-[124px]"
    >
      <defs>
        <filter id="arc-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* tick marks around the dial */}
      <g stroke="var(--concept-grid)" strokeWidth={1}>
        {Array.from({ length: TICK_COUNT }, (_, index) => {
          const t = index / (TICK_COUNT - 1)
          const angle = startAngle + t * SWEEP_DEG
          const outer = polar(angle, RADIUS + STROKE / 2 + 3)
          const inner = polar(angle, RADIUS + STROKE / 2 - 1)
          return (
            <line key={index} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
          )
        })}
      </g>

      <g
        transform={`rotate(${rotation} ${CENTER} ${CENTER})`}
        strokeLinecap="round"
        fill="none"
      >
        {/* dim track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="var(--concept-grid)"
          strokeWidth={STROKE}
          strokeDasharray={`${TRACK_LEN} ${CIRC}`}
        />
        {/* glowing progress sweep — grows from empty to target */}
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${TRACK_LEN} ${CIRC}`}
          filter="url(#arc-glow)"
          initial={{ strokeDashoffset: TRACK_LEN }}
          animate={{ strokeDashoffset: TRACK_LEN - progressLen }}
          transition={{ delay, duration: DURATION, ease: EASE }}
        />
      </g>

      {/* endpoint marker dot at the live value (fades in as the sweep lands) */}
      <motion.circle
        cx={polar(startAngle + (SWEEP_DEG * clamped) / 100, RADIUS).x}
        cy={polar(startAngle + (SWEEP_DEG * clamped) / 100, RADIUS).y}
        r={3}
        fill={color}
        filter="url(#arc-glow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + DURATION * 0.7, duration: 0.3 }}
      />

      {/* center readout — counts up */}
      <motion.text
        x={CENTER}
        y={CENTER - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        className="concept-display concept-tnum"
        style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}
      >
        {display}
      </motion.text>
      <text
        x={CENTER}
        y={CENTER + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--muted-foreground)"
        className="concept-display"
        style={{ fontSize: 9, letterSpacing: "0.22em" }}
      >
        ПРОГРЕСС %
      </text>
      {/* scale endpoints for a finished instrument look */}
      <circle
        cx={polar(startAngle, RADIUS).x}
        cy={polar(startAngle, RADIUS).y}
        r={1.5}
        fill="var(--concept-grid)"
      />
      <circle
        cx={polar(endAngle, RADIUS).x}
        cy={polar(endAngle, RADIUS).y}
        r={1.5}
        fill="var(--concept-grid)"
      />
    </svg>
  )
}
