import { useState } from "react"
import {
  ArrowUpRight,
  Footprints,
  GraduationCap,
  PiggyBank,
  Rocket,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import {
  daysUntil,
  effortLabel,
  formatTargetDate,
  getGoalMeta,
  getGoalTasks,
  getTaskCounts,
  goals,
  navSections,
  overallProgress,
  taskStatusLabel,
  weeklyReview,
  type GoalMeta,
} from "../concept-data"
import { CompassRose, type CompassArc } from "./compass-rose"

const GOAL_ICONS: Record<GoalMeta["icon"], LucideIcon> = {
  Footprints,
  GraduationCap,
  PiggyBank,
  Rocket,
}

/** Active, unfinished tasks ranked by urgency (closest due date first). */
function rankByUrgency() {
  return goals
    .flatMap((goal) =>
      getGoalTasks(goal.id)
        .filter((task) => task.status === "doing" || task.status === "todo")
        .map((task) => ({ task, goal })),
    )
    .sort((a, b) => daysUntil(a.task.dueDate) - daysUntil(b.task.dueDate))
}

function dueLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days < 0) return `просрочено на ${Math.abs(days)} дн.`
  if (days === 0) return "сегодня"
  if (days === 1) return "завтра"
  return `через ${days} дн.`
}

export function CompassConcept() {
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id ?? "")

  const arcs: CompassArc[] = goals.map((goal) => {
    const meta = getGoalMeta(goal.id)
    return {
      id: goal.id,
      label: goal.title,
      progress: goal.progressPercent,
      chart: meta.chart,
      active: goal.id === selectedGoalId,
    }
  })

  const focus = rankByUrgency()[0]
  const focusMeta = focus ? getGoalMeta(focus.goal.id) : undefined

  const toggleGoal = (id: string) =>
    setSelectedGoalId((current) => (current === id ? "" : id))

  return (
    <div
      data-testid="concept-compass-root"
      className="mx-auto w-full max-w-5xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16"
    >
      {/* 1 — Hero: курс на сегодня. */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_minmax(0,0.95fr)] lg:gap-14">
        <div className="order-2 lg:order-1">
          <p className="concept-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
            FocusTrack AI · Личный план
          </p>
          <h1 className="concept-display mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Курс на сегодня
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Один ориентир вместо десятка уведомлений. Компас собирает четыре цели
            Алекса в общий курс и подсказывает, на чём держать фокус прямо сейчас.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="concept-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                Активных целей
              </dt>
              <dd className="concept-display concept-tnum mt-1 text-2xl font-semibold text-foreground">
                {goals.length}
              </dd>
            </div>
            <div>
              <dt className="concept-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                Общий курс
              </dt>
              <dd className="concept-display concept-tnum mt-1 text-2xl font-semibold text-primary">
                {overallProgress}%
              </dd>
            </div>
          </dl>
        </div>

        {/* 2 — SIGNATURE: compass rose. */}
        <div className="order-1 flex justify-center lg:order-2">
          <CompassRose
            overall={overallProgress}
            arcs={arcs}
            onSelect={toggleGoal}
          />
        </div>
      </section>

      {/* 3 — Главная задача дня. */}
      {focus && focusMeta ? (
        <section className="mt-16" aria-labelledby="focus-heading">
          <h2
            id="focus-heading"
            className="concept-mono text-xs uppercase tracking-[0.24em] text-muted-foreground"
          >
            Главная задача дня
          </h2>
          <article className="mt-4 rounded-[var(--radius)] bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: `var(--chart-${focusMeta.chart})` }}
              >
                <FocusGoalIcon icon={focusMeta.icon} />
                {focus.goal.title}
              </span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className="text-sm text-muted-foreground">{focusMeta.category}</span>
            </div>
            <p className="concept-display mt-3 text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
              {focus.task.title}
            </p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {focus.task.notes}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="concept-mono text-muted-foreground">
                {taskStatusLabel(focus.task.status)}
              </span>
              <span className="concept-mono text-muted-foreground">
                {effortLabel(focus.task.effort)}
              </span>
              <span className="concept-tnum text-foreground">
                Срок: {formatTargetDate(focus.task.dueDate)}
                <span className="ml-2 text-accent-foreground">
                  · {dueLabel(focus.task.dueDate)}
                </span>
              </span>
            </div>
          </article>
        </section>
      ) : null}

      {/* 4 — Цели как тихие waypoints. */}
      <section className="mt-16" aria-labelledby="waypoints-heading">
        <div className="flex items-baseline justify-between">
          <h2
            id="waypoints-heading"
            className="concept-mono text-xs uppercase tracking-[0.24em] text-muted-foreground"
          >
            Ориентиры курса
          </h2>
          <p className="concept-tnum text-xs text-muted-foreground">
            {goals.length} цели · общий курс {overallProgress}%
          </p>
        </div>

        <ul className="mt-6 divide-y divide-border border-y border-border">
          {goals.map((goal) => (
            <WaypointRow
              key={goal.id}
              goalId={goal.id}
              expanded={goal.id === selectedGoalId}
              onToggle={() => toggleGoal(goal.id)}
            />
          ))}
        </ul>
      </section>

      {/* 5 — Итоги недели (AI-ревью). */}
      <section className="mt-16" aria-labelledby="review-heading">
        <h2
          id="review-heading"
          className="concept-mono text-xs uppercase tracking-[0.24em] text-muted-foreground"
        >
          Итоги недели · AI-ревью
        </h2>
        <div className="mt-4 rounded-[var(--radius)] border border-border bg-card/60 p-6 sm:p-8">
          <p className="concept-tnum text-xs uppercase tracking-wider text-muted-foreground">
            Неделя с {formatTargetDate(weeklyReview.weekStart)}
          </p>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-foreground">
            {weeklyReview.summary}
          </p>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles
                  aria-hidden
                  className="size-4 text-accent-foreground"
                  strokeWidth={1.75}
                />
                Рекомендации
              </h3>
              <ul className="mt-3 space-y-3">
                {weeklyReview.recommendations.map((rec) => (
                  <li
                    key={rec}
                    className="relative pl-5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-2 size-1.5 rounded-full bg-accent"
                    />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <TriangleAlert
                  aria-hidden
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.75}
                />
                Риски
              </h3>
              <ul className="mt-3 space-y-3">
                {weeklyReview.risks.map((risk) => (
                  <li
                    key={risk}
                    className="relative pl-5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 text-muted-foreground"
                    >
                      —
                    </span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — Тихий футер с разделами продукта. */}
      <footer className="mt-16 border-t border-border pt-6">
        <p className="concept-mono text-xs tracking-wide text-muted-foreground">
          FocusTrack AI ·{" "}
          {navSections.map((section, index) => (
            <span key={section.id}>
              {index > 0 ? <span aria-hidden> · </span> : null}
              <span className="text-foreground/70">{section.label}</span>
            </span>
          ))}
        </p>
      </footer>
    </div>
  )
}

function FocusGoalIcon({ icon }: { icon: GoalMeta["icon"] }) {
  const Icon = GOAL_ICONS[icon]
  return <Icon aria-hidden className="size-4" strokeWidth={1.75} />
}

function WaypointRow({
  goalId,
  expanded,
  onToggle,
}: {
  goalId: string
  expanded: boolean
  onToggle: () => void
}) {
  const goal = goals.find((g) => g.id === goalId)
  if (!goal) return null

  const meta = getGoalMeta(goalId)
  const Icon = GOAL_ICONS[meta.icon]
  const counts = getTaskCounts(goalId)
  const tasks = getGoalTasks(goalId)
  const nearest = tasks
    .filter((task) => task.status === "doing" || task.status === "todo")
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))[0]
  const color = `var(--chart-${meta.chart})`
  const panelId = `waypoint-panel-${goalId}`

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="group flex w-full items-center gap-4 py-5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:gap-6"
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/10 transition-colors"
          style={{
            color,
            backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
          }}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="truncate text-base font-medium text-foreground">
              {goal.title}
            </span>
            <span className="concept-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
              {meta.category}
            </span>
          </span>

          <span className="mt-3 flex items-center gap-3">
            <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                style={{ width: `${goal.progressPercent}%`, backgroundColor: color }}
              />
            </span>
            <span className="concept-tnum w-9 shrink-0 text-right text-sm font-medium text-foreground">
              {goal.progressPercent}%
            </span>
          </span>

          <span className="concept-tnum mt-2 block text-xs text-muted-foreground">
            {counts.total} задач · {counts.done} готово
            {nearest ? (
              <span>
                {" · "}
                ближайшая: {nearest.title} ({dueLabel(nearest.dueDate)})
              </span>
            ) : null}
          </span>
        </span>

        <ArrowUpRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
            expanded ? "rotate-90 text-foreground" : "group-hover:translate-x-0.5",
          )}
          strokeWidth={1.75}
        />
      </button>

      {expanded ? (
        <div id={panelId} className="pb-5 pl-14 pr-1 sm:pl-16">
          <ul className="space-y-2 border-l border-border pl-4">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
              >
                <span
                  className={cn(
                    "text-foreground",
                    task.status === "done" && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </span>
                <span className="concept-mono concept-tnum shrink-0 text-xs text-muted-foreground">
                  {taskStatusLabel(task.status)} · {formatTargetDate(task.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}
