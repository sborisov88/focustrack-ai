import type {
  AiSession,
  FocusTask,
  Goal,
  KnowledgeDocument,
  NewGoalInput,
  TaskStatus,
  WeeklyReview,
  Workspace,
} from "@/lib/domain"
import { demoWorkspace } from "@/lib/demo-data"
import { calculateProgress, getGoalTasks } from "@/lib/progress"
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase"

type DbGoalRow = {
  id: string
  title: string
  description: string
  status: Goal["status"]
  target_date: string | null
  clarified_context: Record<string, string> | null
  progress_percent: number
}

type DbTaskRow = {
  id: string
  goal_id: string
  title: string
  notes: string
  effort: FocusTask["effort"]
  due_date: string | null
  status: FocusTask["status"]
  sort_order: number
}

type DbSessionRow = {
  id: string
  goal_id: string | null
  type: AiSession["type"]
  model: string
  output: { summary?: string } | null
  status: AiSession["status"]
  created_at: string
}

type DbReviewRow = {
  week_start: string
  summary: string
  recommendations: string[] | null
  risks: string[] | null
}

type DbDocumentRow = {
  id: string
  title: string
  source: string
  content: string
}

function mapGoal(row: DbGoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    targetDate: row.target_date ?? "",
    progressPercent: row.progress_percent,
    clarifiedContext: row.clarified_context ?? {},
  }
}

function mapTask(row: DbTaskRow): FocusTask {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    notes: row.notes,
    effort: row.effort,
    dueDate: row.due_date ?? "",
    status: row.status,
    sortOrder: row.sort_order,
  }
}

function mapSession(row: DbSessionRow): AiSession {
  return {
    id: row.id,
    goalId: row.goal_id ?? "",
    type: row.type,
    model: row.model,
    status: row.status,
    summary: row.output?.summary ?? "",
    createdAt: row.created_at,
  }
}

function mapReview(row: DbReviewRow): WeeklyReview {
  return {
    weekStart: row.week_start,
    summary: row.summary,
    recommendations: row.recommendations ?? [],
    risks: row.risks ?? [],
  }
}

function mapDocument(row: DbDocumentRow): KnowledgeDocument {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    content: row.content,
  }
}

const emptyReview: WeeklyReview = {
  weekStart: "",
  summary: "Пока нет недельного обзора — он появится после первого AI Review.",
  recommendations: [],
  risks: [],
}

export async function loadWorkspace(): Promise<Workspace> {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return demoWorkspace
  }

  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    return { ...demoWorkspace, mode: "demo" }
  }

  const [goalsRes, tasksRes, sessionsRes, reviewRes, documentsRes] =
    await Promise.all([
      supabase
        .from("goals")
        .select(
          "id,title,description,status,target_date,clarified_context,progress_percent",
        )
        .order("created_at"),
      supabase
        .from("tasks")
        .select("id,goal_id,title,notes,effort,due_date,status,sort_order")
        .order("sort_order"),
      supabase
        .from("ai_sessions")
        .select("id,goal_id,type,model,output,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("weekly_reviews")
        .select("week_start,summary,recommendations,risks")
        .order("week_start", { ascending: false })
        .limit(1),
      supabase
        .from("knowledge_documents")
        .select("id,title,source,content")
        .order("created_at"),
    ])

  const goalRows = (goalsRes.data ?? []) as DbGoalRow[]

  // Authenticated but no rows yet: keep the demo workspace visible so the
  // dashboard always has content to render.
  if (goalsRes.error || goalRows.length === 0) {
    return { ...demoWorkspace, mode: "supabase" }
  }

  const reviewRows = (reviewRes.data ?? []) as DbReviewRow[]

  return {
    mode: "supabase",
    goals: goalRows.map(mapGoal),
    tasks: ((tasksRes.data ?? []) as DbTaskRow[]).map(mapTask),
    aiSessions: ((sessionsRes.data ?? []) as DbSessionRow[]).map(mapSession),
    weeklyReview: reviewRows[0] ? mapReview(reviewRows[0]) : emptyReview,
    knowledgeDocuments: ((documentsRes.data ?? []) as DbDocumentRow[]).map(
      mapDocument,
    ),
  }
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
      "Демо-режим: прогресс устойчивый, но следующий шаг стоит сузить до одного проверяемого действия. Начните с ближайшей задачи по выбранной цели.",
    createdAt: new Date().toISOString(),
  }
}
