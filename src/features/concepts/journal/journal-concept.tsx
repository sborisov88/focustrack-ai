import { useState } from "react"
import {
  ChevronDown,
  Footprints,
  GraduationCap,
  type LucideIcon,
  PiggyBank,
  Rocket,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  conceptPersona,
  daysUntil,
  effortLabel,
  formatTargetDate,
  getGoalMeta,
  getGoalTasks,
  getTaskCounts,
  goals,
  knowledgeDocuments,
  navSections,
  overallProgress,
  taskStatusLabel,
  weeklyReview,
} from "@/features/concepts/concept-data"

import { ContourMap } from "./contour-map"
import { CoachThread } from "./coach-thread"

const GOAL_ICONS: Record<string, LucideIcon> = {
  Footprints,
  GraduationCap,
  PiggyBank,
  Rocket,
}

const RU_MONTHS_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
]

/** "2026-06-15" → "15 июня 2026" (для строки даты «обложки»). */
function formatWeekLong(iso: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number.parseInt(part, 10))
  if (!year || !month || !day) return iso
  return `${day} ${RU_MONTHS_GEN[month - 1] ?? ""} ${year}`
}

/** Concept 3 — «Полевой журнал» (Mobile Coach). */
export function JournalConcept() {
  // Первый вейпоинт раскрыт по умолчанию, чтобы маршрут сразу «дышал».
  const [openGoalId, setOpenGoalId] = useState<string | null>(goals[0]?.id ?? null)

  return (
    <div
      data-testid="concept-journal-root"
      className="relative min-h-dvh overflow-x-hidden bg-background text-foreground"
    >
      {/* SIGNATURE A — рельеф заполняет поля вокруг центральной колонки. */}
      <ContourMap className="absolute inset-x-0 top-0 -z-10 h-[60vh] w-full opacity-90" />
      <ContourMap className="absolute right-0 top-1/4 -z-10 hidden h-[80vh] w-[40vw] opacity-70 lg:block" />
      <ContourMap className="absolute left-0 bottom-0 -z-10 hidden h-[70vh] w-[40vw] -scale-x-100 opacity-70 lg:block" />

      <div className="mx-auto w-full max-w-[34rem] px-5 pb-20 pt-8 sm:px-6">
        {/* ----------------------------------------------------------------- */}
        {/* 2 — обложка журнала                                               */}
        {/* ----------------------------------------------------------------- */}
        <header className="rounded-2xl border border-border bg-card/80 px-5 py-6 shadow-sm backdrop-blur-sm">
          <p className="concept-display text-xs italic tracking-wide text-accent">
            Полевой журнал · неделя от{" "}
            <time dateTime={weeklyReview.weekStart}>
              {formatWeekLong(weeklyReview.weekStart)}
            </time>
          </p>
          <h1 className="concept-display mt-2 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Дорога к четырём вершинам
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Личный маршрут <span className="text-foreground">{conceptPersona}</span> —
            четыре цели, к которым ты поднимаешься шаг за шагом вместе с AI-коучем.
          </p>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Общий подъём
              </p>
              <p className="concept-display concept-tnum mt-0.5 text-3xl font-bold leading-none text-primary">
                {overallProgress}
                <span className="text-xl">%</span>
              </p>
            </div>
            <ElevationBadge value={overallProgress} />
          </div>
        </header>

        {/* ----------------------------------------------------------------- */}
        {/* 3 — SIGNATURE B: маршрут (вертикальный таймлайн вейпоинтов)        */}
        {/* ----------------------------------------------------------------- */}
        <section aria-labelledby="route-heading" className="mt-12">
          <header className="mb-5">
            <p className="concept-display text-xs italic tracking-wide text-accent">
              маршрут
            </p>
            <h2
              id="route-heading"
              className="concept-display mt-1 text-2xl font-semibold leading-tight text-foreground"
            >
              Четыре вершины
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Нажми на отметку, чтобы развернуть участок маршрута.
            </p>
          </header>

          <ol className="relative">
            {/* Сама «тропа» — вертикальная линия маршрута за маркерами. */}
            <span
              aria-hidden
              className="absolute left-[1.4375rem] top-3 bottom-3 w-0.5 -translate-x-1/2 rounded-full bg-border"
            />
            {goals.map((goal) => (
              <Waypoint
                key={goal.id}
                goalId={goal.id}
                isOpen={openGoalId === goal.id}
                onToggle={() =>
                  setOpenGoalId((current) => (current === goal.id ? null : goal.id))
                }
              />
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* 4 — SIGNATURE C: тетрадь коуча                                     */}
        {/* ----------------------------------------------------------------- */}
        <CoachThread />

        {/* ----------------------------------------------------------------- */}
        {/* 5 — «Заметки в дорогу» (knowledge / RAG)                          */}
        {/* ----------------------------------------------------------------- */}
        <section aria-labelledby="notes-heading" className="mt-12">
          <header className="mb-5">
            <p className="concept-display text-xs italic tracking-wide text-accent">
              заметки в дорогу
            </p>
            <h2
              id="notes-heading"
              className="concept-display mt-1 text-2xl font-semibold leading-tight text-foreground"
            >
              Вырезки из дневника
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Коуч опирается на твои записи, отвечая на вопросы по ним.
            </p>
          </header>

          <ul className="space-y-4">
            {knowledgeDocuments.map((doc) => (
              <li
                key={doc.id}
                className="rounded-xl border border-border border-l-2 border-l-accent/60 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-sm"
              >
                <h3 className="concept-display text-base font-semibold leading-snug text-foreground">
                  {doc.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {doc.content}
                </p>
              </li>
            ))}
          </ul>

          {/* Витрина RAG-потока: оформленное, нефункциональное поле + clay CTA. */}
          <form
            className="mt-5 flex flex-col gap-2 rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="journal-rag" className="sr-only">
              Спросить по заметкам
            </label>
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="journal-rag"
                type="text"
                readOnly
                placeholder="Спросить по заметкам: «успеваю ли я по бегу?»"
                className="pl-9"
              />
            </div>
            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Спросить
            </Button>
          </form>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* 6 — спокойный футер с разделами продукта                          */}
        {/* ----------------------------------------------------------------- */}
        <footer className="mt-16 border-t border-border pt-6">
          <p className="concept-display text-xs italic text-muted-foreground">
            FocusTrack AI · полевой журнал
          </p>
          <nav aria-label="Разделы продукта" className="mt-3">
            <ul className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
              {navSections.map((section, index) => (
                <li key={section.id} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <span aria-hidden className="text-border">
                      ·
                    </span>
                  )}
                  <span className="text-foreground">{section.label}</span>
                </li>
              ))}
            </ul>
          </nav>
        </footer>
      </div>
    </div>
  )
}

/** Маленький подъём-индикатор: «горка» с засечкой высоты под общий прогресс. */
function ElevationBadge({ value }: { value: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 96 48"
      className="h-10 w-20 shrink-0 text-primary"
      fill="none"
    >
      <path
        d="M4 44 L40 12 L60 28 L92 4"
        stroke="var(--border)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 44 L40 12 L60 28 L92 4"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - value}
      />
      <circle cx={40} cy={12} r={3} fill="currentColor" />
    </svg>
  )
}

type WaypointProps = {
  goalId: string
  isOpen: boolean
  onToggle: () => void
}

/** Один вейпоинт маршрута: маркер-высота + раскрываемая карточка участка. */
function Waypoint({ goalId, isOpen, onToggle }: WaypointProps) {
  const goal = goals.find((item) => item.id === goalId)
  if (!goal) return null

  const meta = getGoalMeta(goalId)
  const counts = getTaskCounts(goalId)
  const goalTasks = getGoalTasks(goalId)
  const accent = `var(--chart-${meta.chart})`
  const Icon = GOAL_ICONS[meta.icon] ?? Footprints
  const remaining = daysUntil(goal.targetDate)
  const panelId = `waypoint-panel-${goalId}`

  // Размер маркера отражает высоту подъёма (прогресс): 2.25rem … 3.25rem.
  const markerSize = 2.25 + (goal.progressPercent / 100) * 1

  return (
    <li className="relative pl-14">
      {/* Маркер-станция: кольцо в цвет цели, заливка по прогрессу. */}
      <span
        aria-hidden
        className="absolute left-[1.4375rem] top-1.5 z-10 -translate-x-1/2 rounded-full border-2 bg-background"
        style={{
          width: `${markerSize}rem`,
          height: `${markerSize}rem`,
          borderColor: accent,
          backgroundImage: `linear-gradient(to top, ${accent} ${goal.progressPercent}%, transparent ${goal.progressPercent}%)`,
        }}
      />
      <span
        aria-hidden
        className="absolute left-[1.4375rem] top-1.5 z-20 flex items-center justify-center text-card"
        style={{
          width: `${markerSize}rem`,
          height: `${markerSize}rem`,
          transform: "translateX(-50%)",
        }}
      >
        <Icon className="size-4" style={{ color: "var(--card)" }} />
      </span>

      <div className="pb-6">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide"
                style={{ backgroundColor: `color-mix(in oklab, ${accent} 16%, transparent)`, color: accent }}
              >
                {meta.category}
              </span>
              <span className="concept-tnum text-xs text-muted-foreground">
                {goal.progressPercent}% · {counts.done}/{counts.total} задач
              </span>
            </span>
            <span className="concept-display mt-1 block text-lg font-semibold leading-snug text-foreground">
              {goal.title}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <div
            id={panelId}
            className="mt-2 rounded-xl border border-border bg-card/60 px-4 py-4 shadow-sm backdrop-blur-sm"
          >
            <p className="text-sm leading-relaxed text-foreground">{goal.description}</p>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                Финиш:{" "}
                <time dateTime={goal.targetDate} className="text-foreground">
                  {formatTargetDate(goal.targetDate)}
                </time>
              </span>
              <span
                className="concept-tnum rounded-full px-2 py-0.5 font-medium"
                style={{
                  backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
                  color: accent,
                }}
              >
                {remaining > 0 ? `${remaining} дн. в пути` : "финиш сегодня"}
              </span>
            </div>

            {/* Цветной прогресс-«высота» под цель. */}
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="presentation"
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${goal.progressPercent}%`, backgroundColor: accent }}
              />
            </div>

            {/* Чек-лист задач участка (read-only демо-состояние). */}
            <ul className="mt-4 space-y-2">
              {goalTasks.map((task) => {
                const done = task.status === "done"
                return (
                  <li key={task.id} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                        done ? "border-transparent text-card" : "border-border",
                      )}
                      style={done ? { backgroundColor: accent } : undefined}
                    >
                      {done && (
                        <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden>
                          <path
                            d="M3.5 8.5l3 3 6-7"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm leading-snug",
                          done
                            ? "text-muted-foreground line-through"
                            : "text-foreground",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {taskStatusLabel(task.status)} · {effortLabel(task.effort)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </li>
  )
}
