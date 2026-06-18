import {
  Activity,
  Flag,
  Footprints,
  GraduationCap,
  PiggyBank,
  Rocket,
  Target,
  type LucideIcon,
} from "lucide-react"

import type { Goal } from "@/lib/domain"

/**
 * Per-goal visual identity for the Mission Control dashboard: a category label,
 * a lucide icon, and a chart-N hue slot. Live goals have arbitrary UUIDs and no
 * `category` field, so we infer icon/category/hue from the title keywords and
 * fall back to the goal's index for hue when nothing matches. Keyword rules map
 * the demo goals to the same hues the /concepts Mission showcase uses.
 */

export type ChartSlot = 1 | 2 | 3 | 4 | 5

export type GoalVisual = {
  chart: ChartSlot
  Icon: LucideIcon
  category: string
}

type Rule = { test: RegExp; chart: ChartSlot; Icon: LucideIcon; category: string }

const RULES: Rule[] = [
  { test: /бег|пробеж|полумарафон|марафон|трениров|спорт|здоров/i, chart: 1, Icon: Footprints, category: "Спорт" },
  { test: /ielts|toefl|англ|язык|экзамен|сертифик|учеб|курс|образован/i, chart: 4, Icon: GraduationCap, category: "Образование" },
  { test: /подушк|накоп|резерв|финанс|деньг|бюджет|сбереж|инвест|расход/i, chart: 5, Icon: PiggyBank, category: "Финансы" },
  { test: /лендинг|проект|запуск|стартап|продукт|бизнес|mvp|пет/i, chart: 3, Icon: Rocket, category: "Запуск" },
]

const FALLBACK_ICONS: LucideIcon[] = [Target, Flag, Activity, Rocket, Footprints]

export function goalVisual(goal: Goal, index: number): GoalVisual {
  const match = RULES.find((rule) => rule.test.test(goal.title))
  if (match) {
    return { chart: match.chart, Icon: match.Icon, category: match.category }
  }
  return {
    chart: ((index % 5) + 1) as ChartSlot,
    Icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length],
    category: "Цель",
  }
}

/** CSS color expression for a chart slot, e.g. "var(--chart-1)". */
export function chartVar(chart: ChartSlot): string {
  return `var(--chart-${chart})`
}

/**
 * Deterministic ascending trend series ending near a goal's current percent,
 * for the telemetry-tile sparkline. Pure (no randomness) so renders are stable.
 */
export function trendSeries(progress: number): number[] {
  const start = Math.max(4, Math.round(progress * 0.35))
  const steps = 8
  return Array.from({ length: steps }, (_, index) => {
    const t = index / (steps - 1)
    const eased = start + (progress - start) * (1 - (1 - t) * (1 - t))
    const ripple = index % 2 === 0 ? 0 : 1.5
    return Math.round(eased + ripple)
  })
}

/** Whole days from the real "today" to an ISO date (live, unlike the concept's fixed date). */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(target.getTime())) return 0
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000)
}

/** "через 5 дн." / "сегодня" / "просрочено на 3 дн." */
export function deadlineLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days < 0) return `просрочено на ${Math.abs(days)} дн.`
  if (days === 0) return "сегодня"
  if (days === 1) return "завтра"
  return `через ${days} дн.`
}
