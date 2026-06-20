import type { FocusTask, Goal } from "@/lib/domain"

const DAY_MS = 24 * 60 * 60 * 1000

function parseDateKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return null
  }

  const [, year, month, day] = match
  return Date.UTC(Number(year), Number(month) - 1, Number(day))
}

function formatDateKey(dayMs: number) {
  return new Date(dayMs).toISOString().slice(0, 10)
}

export function getGoalTasks(goalId: string, tasks: FocusTask[]) {
  return tasks
    .filter((task) => task.goalId === goalId)
    .toSorted((left, right) => left.sortOrder - right.sortOrder)
}

export function calculateProgress(tasks: FocusTask[]) {
  if (!tasks.length) {
    return 0
  }

  const done = tasks.filter((task) => task.status === "done").length
  return Math.round((done / tasks.length) * 100)
}

export function calculateCurrentStreakDays(tasks: FocusTask[]) {
  const doneDays = new Set(
    tasks
      .filter((task) => task.status === "done" && parseDateKey(task.dueDate))
      .map((task) => task.dueDate),
  )

  if (!doneDays.size) {
    return 0
  }

  const latestDay = [...doneDays].toSorted().at(-1)
  const latestDayMs = latestDay ? parseDateKey(latestDay) : null

  if (latestDayMs === null) {
    return 0
  }

  let streak = 0
  let currentDayMs = latestDayMs

  while (doneDays.has(formatDateKey(currentDayMs))) {
    streak += 1
    currentDayMs -= DAY_MS
  }

  return streak
}

export function enrichGoals(goals: Goal[], tasks: FocusTask[]) {
  return goals.map((goal) => ({
    ...goal,
    progressPercent: calculateProgress(getGoalTasks(goal.id, tasks)),
  }))
}

export function getStatusLabel(status: Goal["status"] | FocusTask["status"]) {
  const labels = {
    active: "Активна",
    blocked: "Блокер",
    completed: "Завершена",
    doing: "В работе",
    done: "Готово",
    draft: "Черновик",
    paused: "Пауза",
    todo: "План",
  } satisfies Record<Goal["status"] | FocusTask["status"], string>

  return labels[status]
}

export function getEffortLabel(effort: FocusTask["effort"]) {
  return effort === "S" ? "до 30 мин" : effort === "M" ? "1-2 часа" : "2+ часа"
}
