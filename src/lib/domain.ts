export type GoalStatus = "draft" | "active" | "paused" | "completed"
export type TaskStatus = "todo" | "doing" | "done" | "blocked"
export type TaskEffort = "S" | "M" | "L"
export type AiSessionType = "clarify" | "plan" | "review" | "rag"
export type WorkspaceMode = "anonymous" | "demo" | "supabase"

export type Goal = {
  id: string
  title: string
  description: string
  status: GoalStatus
  targetDate: string
  progressPercent: number
  clarifiedContext: Record<string, string>
}

export type FocusTask = {
  id: string
  goalId: string
  title: string
  notes: string
  effort: TaskEffort
  dueDate: string
  status: TaskStatus
  sortOrder: number
}

export type AiSession = {
  id: string
  goalId: string
  type: AiSessionType
  model: string
  status: "queued" | "completed" | "failed"
  summary: string
  createdAt: string
}

export type WeeklyReview = {
  weekStart: string
  summary: string
  recommendations: string[]
  risks: string[]
}

export type KnowledgeDocument = {
  id: string
  title: string
  source: string
  content: string
}

export type Workspace = {
  mode: WorkspaceMode
  goals: Goal[]
  tasks: FocusTask[]
  aiSessions: AiSession[]
  weeklyReview: WeeklyReview
  knowledgeDocuments: KnowledgeDocument[]
}

export type NewGoalInput = {
  title: string
  description: string
  targetDate: string
}
