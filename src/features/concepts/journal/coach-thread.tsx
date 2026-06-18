import { Compass, Lightbulb, ShieldAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  aiSessions,
  aiSessionTypeLabel,
  conceptPersona,
  getGoalById,
  getGoalMeta,
  weeklyReview,
} from "@/features/concepts/concept-data"

/**
 * SIGNATURE C — «тетрадь коуча»: переписка AI-коуча с Алексом.
 *
 * Все реплики выведены из РЕАЛЬНЫХ данных:
 *  - каждая aiSession.summary → тёплое сообщение коуча с тегом типа сессии;
 *  - weeklyReview → большое сообщение «итоги недели» с summary,
 *    recommendations[] («что сделать дальше») и risks[] («на что обратить внимание»).
 *
 * Голос коуча — тёплый, на «ты», как у спутника в экспедиции.
 */

type CoachBubbleProps = {
  /** Курсивный «надзаголовок» в духе записи от руки. */
  kicker: string
  /** Цвет акцентного штриха слева (chart-N hue или ink). */
  accent: string
  children: React.ReactNode
}

function CoachBubble({ kicker, accent, children }: CoachBubbleProps) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm"
      >
        <Compass className="size-4" />
      </span>
      <div
        className="relative max-w-[34ch] flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <p className="concept-display text-[0.78rem] italic leading-snug text-muted-foreground">
          {kicker}
        </p>
        <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-foreground">
          {children}
        </div>
      </div>
    </li>
  )
}

export function CoachThread() {
  return (
    <section aria-labelledby="coach-heading" className="mt-12">
      <header className="mb-5">
        <p className="concept-display text-xs italic tracking-wide text-accent">
          тетрадь коуча
        </p>
        <h2
          id="coach-heading"
          className="concept-display mt-1 text-2xl font-semibold leading-tight text-foreground"
        >
          Заметки на полях
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-коуч идёт рядом и пишет {conceptPersona} по ходу маршрута.
        </p>
      </header>

      <ol className="space-y-5">
        {aiSessions.map((session) => {
          const goal = getGoalById(session.goalId)
          const meta = getGoalMeta(session.goalId)
          const accent = `var(--chart-${meta.chart})`
          return (
            <CoachBubble
              key={session.id}
              kicker={`${aiSessionTypeLabel(session.type)} · ${goal?.title ?? "цель"}`}
              accent={accent}
            >
              <p>
                {session.type === "clarify" && "Давай зафиксируем вводные. "}
                {session.type === "plan" && "Разложил твою цель на шаги. "}
                {session.type === "review" && "Сверились по прогрессу. "}
                {session.summary}
              </p>
            </CoachBubble>
          )
        })}

        {/* Итоги недели как отдельная, более крупная запись коуча. */}
        <CoachBubble
          kicker={`итоги недели · от ${formatWeek(weeklyReview.weekStart)}`}
          accent="var(--concept-ink)"
        >
          <p>{weeklyReview.summary}</p>

          <div>
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Lightbulb aria-hidden className="size-3.5 text-accent" />
              Что сделать дальше
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {weeklyReview.recommendations.map((rec) => (
                <li key={rec} className="flex gap-2 text-muted-foreground">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <span className="text-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldAlert aria-hidden className="size-3.5 text-accent" />
              На что обратить внимание
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {weeklyReview.risks.map((risk) => (
                <li key={risk} className="flex gap-2 text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-2 size-1.5 shrink-0 rounded-full",
                      "bg-muted-foreground/60",
                    )}
                  />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </CoachBubble>
      </ol>
    </section>
  )
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

/** "2026-06-15" → "15 июня" (родительный падеж для фразы «от …»). */
function formatWeek(iso: string): string {
  const [, month, day] = iso.split("-").map((part) => Number.parseInt(part, 10))
  if (!month || !day) return iso
  return `${day} ${RU_MONTHS_GEN[month - 1] ?? ""}`
}
