import { useState } from "react"
import {
  Footprints,
  GraduationCap,
  PiggyBank,
  Rocket,
  Radar,
  Database,
  ListChecks,
  Activity,
  TriangleAlert,
  CircleCheck,
  CircleDashed,
  LoaderCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMountEffect } from "@/hooks/use-mount-effect"
import { cn } from "@/lib/utils"

import {
  aiSessions,
  aiSessionTypeLabel,
  conceptPersona,
  daysUntil,
  effortLabel,
  formatTargetDate,
  getGoalMeta,
  getGoalTasks,
  getLatestSessionForGoal,
  getTaskCounts,
  goals,
  knowledgeDocuments,
  overallProgress,
  PRODUCT_TODAY,
  tasks,
  taskStatusLabel,
  weeklyReview,
} from "@/features/concepts/concept-data"
import type { GoalMeta } from "@/features/concepts/concept-data"
import type { AiSession, FocusTask, Goal, TaskStatus } from "@/lib/domain"

import { Panel } from "@/components/telemetry/panel"
import { Sparkline } from "@/components/telemetry/sparkline"
import { StatBlock } from "@/components/telemetry/stat-block"
import { TelemetryArc } from "@/components/telemetry/telemetry-arc"

const GOAL_ICONS: Record<GoalMeta["icon"], LucideIcon> = {
  Footprints,
  GraduationCap,
  PiggyBank,
  Rocket,
}

const SESSION_STATUS_LABEL: Record<AiSession["status"], string> = {
  queued: "в очереди",
  completed: "завершено",
  failed: "ошибка",
}

const TASK_STATUS_ICON: Record<TaskStatus, LucideIcon> = {
  todo: CircleDashed,
  doing: LoaderCircle,
  done: CircleCheck,
  blocked: TriangleAlert,
}

/** "var(--chart-N)" expression for a goal's hue. */
function chartVar(meta: GoalMeta): string {
  return `var(--chart-${meta.chart})`
}

/** Deterministic ascending trend series ending near the goal's current %. */
function trendSeries(progress: number): number[] {
  const start = Math.max(4, Math.round(progress * 0.35))
  const steps = 8
  return Array.from({ length: steps }, (_, index) => {
    const t = index / (steps - 1)
    // ease-out curve toward the current value + a tiny deterministic ripple
    const eased = start + (progress - start) * (1 - (1 - t) * (1 - t))
    const ripple = index % 2 === 0 ? 0 : 1.5
    return Math.round(eased + ripple)
  })
}

/** "2026-06-15T08:30:00+03:00" -> "15.06 · 08:30". Pure, no locale. */
function formatSessionStamp(iso: string): string {
  const [date, rest] = iso.split("T")
  const [, month, day] = date.split("-")
  const time = (rest ?? "").slice(0, 5)
  return `${day}.${month} · ${time}`
}

function CategoryChip({ meta }: { meta: GoalMeta }) {
  return (
    <span
      className="concept-display inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] tracking-[0.18em] uppercase"
      style={{
        color: chartVar(meta),
        borderColor: chartVar(meta),
        backgroundColor: `color-mix(in oklab, ${chartVar(meta)} 12%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5"
        style={{ backgroundColor: chartVar(meta) }}
      />
      {meta.category}
    </span>
  )
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const Icon = TASK_STATUS_ICON[status]
  const tone: Record<TaskStatus, string> = {
    todo: "text-muted-foreground border-border",
    doing: "text-primary border-primary/60",
    done: "text-[color:var(--chart-5)] border-[color:var(--chart-5)]/60",
    blocked: "text-destructive border-destructive/60",
  }
  return (
    <span
      className={cn(
        "concept-display inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] tracking-[0.14em] uppercase",
        tone[status],
      )}
    >
      <Icon aria-hidden className="size-3" />
      {taskStatusLabel(status)}
    </span>
  )
}

function TelemetryTile({
  goal,
  armed,
}: {
  goal: Goal
  armed: boolean
}) {
  const meta = getGoalMeta(goal.id)
  const color = chartVar(meta)
  const counts = getTaskCounts(goal.id)
  const Icon = GOAL_ICONS[meta.icon]
  const session = getLatestSessionForGoal(goal.id)
  const goalTasks = getGoalTasks(goal.id)
  const nextTask =
    goalTasks.find((task) => task.status === "doing") ??
    goalTasks.find((task) => task.status === "todo") ??
    goalTasks[0]
  const days = daysUntil(goal.targetDate)

  return (
    <article
      className="relative flex flex-col gap-4 overflow-hidden border border-border bg-card p-4"
      style={{
        backgroundImage: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, ${color} 9%, transparent), transparent 60%)`,
      }}
    >
      {/* hue rail */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />

      <header className="flex items-start justify-between gap-3 pl-2">
        <div className="flex flex-col gap-2">
          <CategoryChip meta={meta} />
          <h3 className="concept-display max-w-[15ch] text-lg leading-tight font-semibold tracking-wide text-foreground uppercase">
            {goal.title}
          </h3>
        </div>
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center border"
          style={{
            color,
            borderColor: `color-mix(in oklab, ${color} 50%, transparent)`,
            backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`,
          }}
        >
          <Icon className="size-4.5" />
        </span>
      </header>

      <div className="flex items-center gap-3 pl-2">
        <TelemetryArc
          value={goal.progressPercent}
          color={color}
          armed={armed}
        />
        <dl className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Готово</dt>
            <dd className="concept-tnum font-medium text-[color:var(--chart-5)]">
              {counts.done}/{counts.total}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">В работе</dt>
            <dd className="concept-tnum font-medium text-primary">{counts.doing}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">К выполнению</dt>
            <dd className="concept-tnum font-medium text-foreground">{counts.todo}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5">
            <dt className="text-muted-foreground">Дедлайн</dt>
            <dd className="concept-tnum font-medium text-foreground">
              {days >= 0 ? `${days} дн` : "просрочено"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-1 pl-2">
        <div className="flex items-center justify-between">
          <span className="concept-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Тренд
          </span>
          <span className="concept-tnum text-[10px] text-muted-foreground">
            до {formatTargetDate(goal.targetDate)}
          </span>
        </div>
        <Sparkline points={trendSeries(goal.progressPercent)} color={color} />
      </div>

      {nextTask ? (
        <div className="flex flex-col gap-1 border-t border-border pt-3 pl-2">
          <span className="concept-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Ближайшая задача
          </span>
          <p className="line-clamp-2 text-xs leading-snug text-foreground">
            <span aria-hidden style={{ color }} className="mr-1">
              ▸
            </span>
            {nextTask.title}
          </p>
        </div>
      ) : null}

      {session ? (
        <p className="concept-tnum pl-2 text-[10px] text-muted-foreground">
          {aiSessionTypeLabel(session.type)} · {formatSessionStamp(session.createdAt)}
        </p>
      ) : null}
    </article>
  )
}

function goalLabel(goalId: string): { title: string; color: string } {
  const goal = goals.find((g) => g.id === goalId)
  const meta = getGoalMeta(goalId)
  return { title: goal?.title ?? goalId, color: chartVar(meta) }
}

export function MissionConcept() {
  const [armed, setArmed] = useState(false)
  useMountEffect(() => {
    const raf = globalThis.requestAnimationFrame(() => setArmed(true))
    return () => globalThis.cancelAnimationFrame(raf)
  })

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((task) => task.status === "done").length
  const doingTasks = tasks.filter((task) => task.status === "doing").length

  const queue: FocusTask[] = [...tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 7)

  const sessionsByTime = [...aiSessions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  return (
    <div
      data-testid="concept-mission-root"
      className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 sm:py-6"
    >
      {/* 1 — FLEET STATUS STRIP -------------------------------------------- */}
      <header
        className="relative overflow-hidden border border-border bg-card"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--concept-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--concept-grid) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60% 120% at 0% 0%, var(--concept-glow), transparent 55%)",
          }}
        />
        <div className="relative flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center border border-primary/60 text-primary"
              style={{ backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)" }}
            >
              <Radar className="size-5" />
            </span>
            <div className="flex flex-col">
              <h1 className="concept-display text-xl leading-none font-semibold tracking-[0.12em] text-foreground uppercase sm:text-2xl">
                FocusTrack AI · Центр управления
              </h1>
              <p className="concept-tnum mt-1 text-xs text-muted-foreground">
                Оператор: {conceptPersona}
              </p>
            </div>
            <span className="ml-auto inline-flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 animate-pulse rounded-full bg-primary"
                style={{ boxShadow: "0 0 8px var(--primary)" }}
              />
              <span className="concept-display text-[10px] tracking-[0.2em] text-primary uppercase">
                В эфире
              </span>
            </span>
          </div>

          <p className="concept-tnum text-xs text-muted-foreground">
            СИСТЕМА · {goals.length} активные цели · обновлено{" "}
            <span className="text-foreground">{formatTargetDate(PRODUCT_TODAY)}</span>{" "}
            · неделя от {formatTargetDate(weeklyReview.weekStart)}
          </p>

          <Separator className="bg-border" />

          <div className="flex flex-wrap items-stretch divide-border [&>*]:border-r [&>*]:border-border [&>*:last-child]:border-r-0">
            <StatBlock label="Общий курс" value={overallProgress} unit="%" accent />
            <StatBlock label="Всего задач" value={totalTasks} />
            <StatBlock label="Готово" value={doneTasks} />
            <StatBlock label="В работе" value={doingTasks} />
          </div>
        </div>
      </header>

      {/* 2 — TELEMETRY TILES (signature bento) ----------------------------- */}
      <section aria-labelledby="fleet-heading" className="mt-4">
        <h2 id="fleet-heading" className="sr-only">
          Телеметрия целей
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {goals.map((goal) => (
            <li key={goal.id} className="flex">
              <TelemetryTile
                goal={goal}
                armed={armed}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 3 — LOG + QUEUE bento --------------------------------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* AI session log */}
        <Panel
          title="Журнал AI-сессий"
          icon={Activity}
          meta={`${aiSessions.length} записи · gemini-2.5-flash-lite`}
        >
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="concept-display h-8 px-3 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  Тип
                </TableHead>
                <TableHead className="concept-display h-8 px-3 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  Цель
                </TableHead>
                <TableHead className="concept-display h-8 px-3 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  Статус
                </TableHead>
                <TableHead className="concept-display h-8 px-3 text-right text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  Время
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionsByTime.map((session) => {
                const goal = goalLabel(session.goalId)
                return (
                  <TableRow key={session.id} className="border-border hover:bg-muted/40">
                    <TableCell className="px-3 py-2">
                      <span className="concept-display inline-flex items-center gap-1.5 text-[11px] tracking-wide text-foreground uppercase">
                        <span
                          aria-hidden
                          className="text-primary"
                          style={{ color: goal.color }}
                        >
                          ▸
                        </span>
                        {aiSessionTypeLabel(session.type)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[14ch] truncate px-3 py-2 text-muted-foreground">
                      {goal.title}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span className="concept-tnum text-[color:var(--chart-5)]">
                        {SESSION_STATUS_LABEL[session.status]}
                      </span>
                    </TableCell>
                    <TableCell className="concept-tnum px-3 py-2 text-right text-muted-foreground">
                      {formatSessionStamp(session.createdAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Panel>

        {/* upcoming task queue */}
        <Panel
          title="Очередь задач"
          icon={ListChecks}
          meta={`${queue.length} ближайших по сроку`}
        >
          <ul className="divide-y divide-border">
            {queue.map((task) => {
              const goal = goalLabel(task.goalId)
              const days = daysUntil(task.dueDate)
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span
                    aria-hidden
                    className="h-8 w-[3px] shrink-0"
                    style={{ backgroundColor: goal.color }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-xs text-foreground">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="concept-tnum truncate text-[10px] text-muted-foreground">
                        {goal.title}
                      </span>
                      <span
                        className="concept-display border px-1.5 text-[10px] tracking-wider uppercase"
                        style={{ color: goal.color, borderColor: `color-mix(in oklab, ${goal.color} 50%, transparent)` }}
                      >
                        {effortLabel(task.effort)}
                      </span>
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="concept-tnum text-xs font-medium text-foreground">
                      {days >= 0 ? `${days} дн` : "—"}
                    </span>
                    <span className="concept-tnum text-[10px] text-muted-foreground">
                      {formatTargetDate(task.dueDate)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      {/* 4 — WEEKLY REVIEW mission log ------------------------------------- */}
      <Panel
        title="Еженедельный обзор · AI-ревью"
        icon={Activity}
        meta={`неделя от ${formatTargetDate(weeklyReview.weekStart)}`}
        className="mt-4"
      >
        <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex flex-col gap-2 bg-card p-4">
            <span className="concept-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Сводка
            </span>
            <p className="text-sm leading-relaxed text-foreground">
              {weeklyReview.summary}
            </p>
          </div>

          <div className="flex flex-col gap-2 bg-card p-4">
            <span className="concept-display text-[10px] tracking-[0.2em] text-primary uppercase">
              Рекомендации
            </span>
            <ul className="flex flex-col gap-2">
              {weeklyReview.recommendations.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-snug text-foreground">
                  <span aria-hidden className="concept-mono shrink-0 text-primary">
                    ▸
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 bg-card p-4">
            <span className="concept-display flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-destructive uppercase">
              <TriangleAlert aria-hidden className="size-3.5" />
              Риски
            </span>
            <ul className="flex flex-col gap-2">
              {weeklyReview.risks.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 border-l-2 border-destructive/70 pl-2 text-xs leading-snug text-foreground"
                >
                  <span aria-hidden className="concept-mono shrink-0 text-destructive">
                    !
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      {/* 5 — RAG corpus strip ---------------------------------------------- */}
      <section aria-labelledby="rag-heading" className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <Database aria-hidden className="size-4 text-primary" />
          <h2
            id="rag-heading"
            className="concept-display text-sm tracking-[0.16em] text-foreground uppercase"
          >
            База знаний · корпус RAG
          </h2>
          <span className="concept-tnum text-[10px] text-muted-foreground">
            {knowledgeDocuments.length} источника
          </span>
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {knowledgeDocuments.map((doc, index) => (
            <li
              key={doc.id}
              className="flex flex-col gap-2 border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="concept-tnum text-[10px] text-muted-foreground">
                  ИСТОЧНИК {String(index + 1).padStart(2, "0")} · {doc.source}
                </span>
                <Badge
                  variant="outline"
                  className="concept-display rounded-none border-primary/50 text-[9px] tracking-wider text-primary uppercase"
                >
                  RAG
                </Badge>
              </div>
              <h3 className="concept-display text-sm leading-tight font-semibold tracking-wide text-foreground uppercase">
                {doc.title}
              </h3>
              <p className="line-clamp-3 text-xs leading-snug text-muted-foreground">
                {doc.content}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
