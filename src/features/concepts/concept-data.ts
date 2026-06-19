/**
 * Shared, read-only data adapter for the UI-concept showcase.
 *
 * Every concept (Compass / Mission Control / Field Journal) renders the SAME
 * real demo content (persona "Алекс Демо", the 4 life goals, tasks, AI sessions,
 * weekly review, knowledge notes) so the three differ ONLY in visual style and
 * layout — the whole point of the concept showcase.
 *
 * Concepts MUST import their content from here and never reach into the
 * dashboard feature. Helpers below give typed selectors + RU display labels
 * that mirror the production dashboard vocabulary.
 */
import { demoWorkspace } from "@/lib/demo-data"
import type {
  AiSession,
  AiSessionType,
  FocusTask,
  Goal,
  KnowledgeDocument,
  TaskEffort,
  TaskStatus,
  WeeklyReview,
  Workspace,
} from "@/lib/domain"

export const conceptWorkspace: Workspace = demoWorkspace
export const conceptPersona = "Алекс Демо"

/** Per-goal semantic metadata shared across concepts (category, icon, color slot). */
export type GoalMeta = {
  /** Short Russian category label. */
  category: string
  /** lucide-react icon name (import dynamically or by name in each concept). */
  icon: "Footprints" | "GraduationCap" | "PiggyBank" | "Rocket"
  /** Which chart-N token color-codes this goal (each concept defines chart-1..5). */
  chart: 1 | 2 | 3 | 4 | 5
  /** One-word essence for compact chips. */
  tag: string
}

export const goalMeta: Record<string, GoalMeta> = {
  "goal-running": { category: "Спорт", icon: "Footprints", chart: 1, tag: "Бег" },
  "goal-ielts": { category: "Образование", icon: "GraduationCap", chart: 4, tag: "IELTS" },
  "goal-savings": { category: "Финансы", icon: "PiggyBank", chart: 5, tag: "Резерв" },
  "goal-petproject": { category: "Запуск", icon: "Rocket", chart: 3, tag: "Лендинг" },
}

export function getGoalMeta(goalId: string): GoalMeta {
  return (
    goalMeta[goalId] ?? { category: "Цель", icon: "Footprints", chart: 2, tag: "Цель" }
  )
}

export const goals: Goal[] = conceptWorkspace.goals
export const tasks: FocusTask[] = conceptWorkspace.tasks
export const aiSessions: AiSession[] = conceptWorkspace.aiSessions
export const weeklyReview: WeeklyReview = conceptWorkspace.weeklyReview
export const knowledgeDocuments: KnowledgeDocument[] = conceptWorkspace.knowledgeDocuments

export function getGoalById(goalId: string): Goal | undefined {
  return goals.find((goal) => goal.id === goalId)
}

export function getGoalTasks(goalId: string): FocusTask[] {
  return tasks
    .filter((task) => task.goalId === goalId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export type TaskCounts = {
  total: number
  todo: number
  doing: number
  done: number
  blocked: number
}

export function getTaskCounts(goalId: string): TaskCounts {
  const goalTasks = getGoalTasks(goalId)
  return {
    total: goalTasks.length,
    todo: goalTasks.filter((t) => t.status === "todo").length,
    doing: goalTasks.filter((t) => t.status === "doing").length,
    done: goalTasks.filter((t) => t.status === "done").length,
    blocked: goalTasks.filter((t) => t.status === "blocked").length,
  }
}

/** Overall completion across all goals (mean of progressPercent). */
export const overallProgress: number = Math.round(
  goals.reduce((sum, goal) => sum + goal.progressPercent, 0) / Math.max(goals.length, 1),
)

export function getLatestSessionForGoal(goalId: string): AiSession | undefined {
  return aiSessions
    .filter((session) => session.goalId === goalId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

// ---------------------------------------------------------------------------
// RU display labels — kept identical to the production dashboard vocabulary.
// ---------------------------------------------------------------------------

export const navSections = [
  { id: "dashboard", label: "Дашборд" },
  { id: "planner", label: "План" },
  { id: "knowledge", label: "Заметки" },
  { id: "review", label: "Обзоры" },
] as const

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "todo":
      return "К выполнению"
    case "doing":
      return "В работе"
    case "done":
      return "Готово"
    case "blocked":
      return "Заблокировано"
  }
}

export function aiSessionTypeLabel(type: AiSessionType): string {
  switch (type) {
    case "clarify":
      return "AI-уточнение"
    case "plan":
      return "AI-план"
    case "review":
      return "AI-ревью"
    case "rag":
      return "RAG-ответ"
  }
}

export function effortLabel(effort: TaskEffort): string {
  switch (effort) {
    case "S":
      return "S · быстро"
    case "M":
      return "M · средне"
    case "L":
      return "L · крупно"
  }
}

const RU_MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
]

/** "2026-09-20" -> "20 сен 2026" (RU short). Pure, no Date locale dependency. */
export function formatTargetDate(iso: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number.parseInt(part, 10))
  if (!year || !month || !day) return iso
  return `${day} ${RU_MONTHS[month - 1] ?? ""} ${year}`
}

/** Whole days from the fixed product "today" (2026-06-18) to target date. */
export const PRODUCT_TODAY = "2026-06-18"

export function daysUntil(iso: string, from: string = PRODUCT_TODAY): number {
  const toMs = Date.parse(`${iso}T00:00:00Z`)
  const fromMs = Date.parse(`${from}T00:00:00Z`)
  if (Number.isNaN(toMs) || Number.isNaN(fromMs)) return 0
  return Math.round((toMs - fromMs) / 86_400_000)
}
