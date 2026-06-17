import type {
  AiSession,
  NewGoalInput,
  TaskStatus,
  Workspace,
} from "@/lib/domain"
import { demoWorkspace } from "@/lib/demo-data"
import { calculateProgress, getGoalTasks } from "@/lib/progress"
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase"

export async function loadWorkspace(): Promise<Workspace> {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return demoWorkspace
  }

  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    return { ...demoWorkspace, mode: "demo" }
  }

  // Remote loading is intentionally narrow for the MVP: the app remains
  // demonstrable without auth, while the schema/API are ready for real users.
  return { ...demoWorkspace, mode: "supabase" }
}

export function createGoal(workspace: Workspace, input: NewGoalInput): Workspace {
  const id = `goal-${Date.now()}`
  const nextGoal = {
    id,
    title: input.title,
    description: input.description,
    status: "draft" as const,
    targetDate: input.targetDate,
    progressPercent: 0,
    clarifiedContext: {
      source: "created-from-dashboard",
    },
  }

  return {
    ...workspace,
    goals: [nextGoal, ...workspace.goals],
  }
}

export function toggleTask(
  workspace: Workspace,
  taskId: string,
  done: boolean
): Workspace {
  const nextStatus: TaskStatus = done ? "done" : "todo"
  const tasks = workspace.tasks.map((task) =>
    task.id === taskId ? { ...task, status: nextStatus } : task
  )

  const goals = workspace.goals.map((goal) => ({
    ...goal,
    progressPercent: calculateProgress(getGoalTasks(goal.id, tasks)),
  }))

  return {
    ...workspace,
    tasks,
    goals,
  }
}

export async function requestWeeklyReview(
  workspace: Workspace,
  goalId: string
): Promise<AiSession> {
  const goalTasks = getGoalTasks(goalId, workspace.tasks)
  const completedTasks = goalTasks
    .filter((task) => task.status === "done")
    .map((task) => task.title)
  const blockedTasks = goalTasks
    .filter((task) => task.status === "blocked")
    .map((task) => task.title)
  const goal = workspace.goals.find((item) => item.id === goalId)
  const supabase = getSupabaseClient()

  if (supabase && hasSupabaseConfig()) {
    const { data, error } = await supabase.functions.invoke("ai-weekly-review", {
      body: {
        weekStart: workspace.weeklyReview.weekStart,
        completedTasks,
        blockedTasks,
        goalProgress: goal?.progressPercent ?? 0,
      },
    })

    if (!error && data?.review) {
      return {
        id: `session-${Date.now()}`,
        goalId,
        type: "review",
        model: data.model ?? "google/gemini-2.5-flash-lite",
        status: "completed",
        summary: data.review,
        createdAt: new Date().toISOString(),
      }
    }
  }

  return {
    id: `session-${Date.now()}`,
    goalId,
    type: "review",
    model: "google/gemini-2.5-flash-lite",
    status: "completed",
    summary:
      "Демо-режим: прогресс устойчивый, но next action нужно сузить до одного проверяемого шага. Начните с завершения текущего ДЗ и обновления артефактов сдачи.",
    createdAt: new Date().toISOString(),
  }
}
