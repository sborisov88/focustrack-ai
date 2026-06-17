import type { FocusTask, Goal } from "@/lib/domain"

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
