import type {
  AiSession,
  FocusTask,
  Goal,
  KnowledgeEmbeddingStatus,
  KnowledgeDocument,
  NewGoalInput,
  TaskStatus,
  WeeklyReview,
  Workspace,
} from "@/lib/domain"
import { demoWorkspace } from "@/lib/demo-data"
import { calculateProgress, getGoalTasks } from "@/lib/progress"
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase"

type SupabaseContext = {
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>
  userId: string
}

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
  output: {
    summary?: string
    plan?: string
    raw?: string
    answer?: string
  } | null
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
  embedding_status?: KnowledgeEmbeddingStatus | null
  embedding_error?: string | null
  embedded_at?: string | null
  updated_at?: string | null
  content_hash?: string | null
}

const documentSelect =
  "id,title,source,content,embedding_status,embedding_error,embedded_at,updated_at,content_hash"

const starterKnowledgeDocument = {
  title: "Журнал тренировок (стартовый источник)",
  source: "starter",
  content:
    "Нед. 1: 12 км. Нед. 4: длинная 12 км. Нед. 6: интервалы 6×400 м. Нед. 8: длинная 15 км — пока самая длинная пробежка. Средний недельный объём растёт примерно на 1 км.",
  tags: ["бег", "тренировки", "стартовый источник"],
}

export type ClarifyGoalResult = {
  type: "clarify"
  model: string
  questions: string[]
  raw: string
}

export type PlanGoalResult = {
  type: "plan"
  model: string
  plan: string
  tasks: GeneratedTaskInput[]
}

export type RagAnswerResult = {
  type: "rag-answer"
  model: string
  answer: string
  citations?: Array<{
    chunkId?: string
    documentId?: string
    title: string
    source?: string
    chunkIndex?: number
    similarity?: number
    content?: string
  }>
  retrieval?: {
    matchCount: number
    threshold: number
    embeddingModel: string
  }
}

export type GeneratedTaskInput = {
  title: string
  notes: string
  effort: FocusTask["effort"]
  dueDate: string
}

type RequestGoalPlanParams = {
  goal: Goal
  answers: Record<string, string>
}

type RequestRagAnswerParams = {
  question: string
  documents: KnowledgeDocument[]
  selectedDocumentId?: string
}

export type KnowledgeDocumentInput = {
  title: string
  content: string
}

type GenerateTasksForGoalResult = {
  result: PlanGoalResult
  tasks: FocusTask[]
}

export type SignedOutWorkspaceMode = Extract<
  Workspace["mode"],
  "anonymous" | "demo"
>

export type LoadWorkspaceOptions = {
  signedOutMode?: SignedOutWorkspaceMode
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
  const output = row.output ?? {}

  return {
    id: row.id,
    goalId: row.goal_id ?? "",
    type: row.type,
    model: row.model,
    status: row.status,
    summary: output.summary ?? output.plan ?? output.raw ?? output.answer ?? "",
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
    embeddingStatus: row.embedding_status ?? "pending",
    embeddingError: row.embedding_error ?? "",
    embeddedAt: row.embedded_at ?? "",
    updatedAt: row.updated_at ?? "",
    contentHash: row.content_hash ?? "",
  }
}

function normalizeKnowledgeDocumentInput(
  input: KnowledgeDocumentInput,
): KnowledgeDocumentInput {
  const title = input.title.trim().slice(0, 140)
  const content = input.content.trim()

  if (title.length < 3) {
    throw new Error("Название заметки должно быть не короче 3 символов.")
  }

  if (content.length < 20) {
    throw new Error("Текст заметки должен быть не короче 20 символов.")
  }

  return { title, content }
}

const emptyReview: WeeklyReview = {
  weekStart: "",
  summary: "Пока нет недельного обзора — он появится после первого запуска обзора недели.",
  recommendations: [],
  risks: [],
}

function createEmptyWorkspace(mode: Workspace["mode"]): Workspace {
  return {
    mode,
    goals: [],
    tasks: [],
    aiSessions: [],
    weeklyReview: emptyReview,
    knowledgeDocuments: [],
  }
}

export const anonymousWorkspace: Workspace = createEmptyWorkspace("anonymous")

function getSignedOutWorkspace(mode: SignedOutWorkspaceMode = "anonymous") {
  return mode === "demo" ? demoWorkspace : anonymousWorkspace
}

// Monday of the current week as YYYY-MM-DD (used when the workspace has no week).
function currentWeekStart(): string {
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - mondayOffset)
  return monday.toISOString().slice(0, 10)
}

function isTaskEffort(value: unknown): value is FocusTask["effort"] {
  return value === "S" || value === "M" || value === "L"
}

function normalizeGeneratedTask(
  task: Partial<GeneratedTaskInput>,
  index: number,
): GeneratedTaskInput {
  const fallbackTitle = `Шаг ${index + 1}`

  return {
    title: (task.title || fallbackTitle).trim().slice(0, 180),
    notes: (task.notes || "Сгенерировано AI-планировщиком.").trim(),
    effort: isTaskEffort(task.effort) ? task.effort : "M",
    dueDate: (task.dueDate || "").trim(),
  }
}

function normalizeGeneratedTasks(tasks: unknown): GeneratedTaskInput[] {
  if (!Array.isArray(tasks)) {
    return []
  }

  return tasks
    .slice(0, 7)
    .map((task, index) =>
      normalizeGeneratedTask(task as Partial<GeneratedTaskInput>, index),
    )
    .filter((task) => task.title.length >= 3)
}

function createDemoTasksForGoal(
  goalId: string,
  tasks: GeneratedTaskInput[],
): FocusTask[] {
  const createdAt = Date.now()

  return tasks.map((task, index) => ({
    id: `task-${createdAt}-${index}`,
    goalId,
    title: task.title,
    notes: task.notes,
    effort: task.effort,
    dueDate: task.dueDate,
    status: "todo",
    sortOrder: index + 1,
  }))
}

function createDemoPlanResult(
  goal: Goal,
  answers: Record<string, string>,
): PlanGoalResult {
  const answerList = Object.entries(answers)
    .filter(([, answer]) => answer.trim())
    .map(([question, answer]) => `${question}: ${answer}`)
    .join("; ")
  const tasks: GeneratedTaskInput[] = [
    {
      title: "Зафиксировать ближайшую контрольную точку",
      notes: `Сформулировать измеримый результат по цели «${goal.title}».`,
      effort: "S",
      dueDate: "",
    },
    {
      title: "Выбрать три задачи на неделю",
      notes: "Разбить ближайший этап на короткие действия с понятным итогом.",
      effort: "M",
      dueDate: "",
    },
    {
      title: "Провести недельную проверку прогресса",
      notes: "Отметить выполненное, риски и следующий самый важный шаг.",
      effort: "S",
      dueDate: goal.targetDate,
    },
  ]

  return {
    type: "plan",
    model: "demo",
    plan: `AI-план для цели «${goal.title}»: 1) зафиксировать ближайшую контрольную точку; 2) выбрать 3 задачи на неделю; 3) каждую неделю проверять прогресс. Контекст: ${answerList || "ответы не заполнены"}.`,
    tasks,
  }
}

async function getSupabaseContext(): Promise<SupabaseContext | null> {
  const supabase = getSupabaseClient()

  if (!supabase || !hasSupabaseConfig()) {
    return null
  }

  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session?.user) {
    return null
  }

  return { supabase, userId: data.session.user.id }
}

async function requireSupabaseContext(): Promise<SupabaseContext> {
  const context = await getSupabaseContext()

  if (!context) {
    throw new Error("Войдите в аккаунт, чтобы сохранить изменения в Supabase.")
  }

  return context
}

export function createLocalGoal(
  input: NewGoalInput,
  clarifiedContext: Record<string, string> = {
    source: "created-from-dashboard",
  },
): Goal {
  return {
    id: `goal-${Date.now()}`,
    title: input.title.trim(),
    description: input.description.trim(),
    status: "draft",
    targetDate: input.targetDate,
    progressPercent: 0,
    clarifiedContext,
  }
}

async function saveAiSession(
  context: SupabaseContext,
  params: {
    goalId?: string
    type: AiSession["type"]
    model: string
    input: Record<string, unknown>
    output: Record<string, unknown>
  },
) {
  const { error } = await context.supabase.from("ai_sessions").insert({
    user_id: context.userId,
    goal_id: params.goalId ?? null,
    type: params.type,
    model: params.model,
    input: params.input,
    output: params.output,
    status: "completed",
  })

  if (error) {
    throw error
  }
}

async function insertGeneratedTasks(
  context: SupabaseContext,
  goalId: string,
  tasks: GeneratedTaskInput[],
): Promise<FocusTask[]> {
  const normalizedTasks = normalizeGeneratedTasks(tasks)

  if (normalizedTasks.length === 0) {
    throw new Error("AI-план не вернул задач для сохранения.")
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .insert(
      normalizedTasks.map((task, index) => ({
        user_id: context.userId,
        goal_id: goalId,
        title: task.title,
        notes: task.notes,
        effort: task.effort,
        due_date: task.dueDate || null,
        status: "todo",
        sort_order: index + 1,
      })),
    )
    .select("id,goal_id,title,notes,effort,due_date,status,sort_order")

  if (error) {
    throw error
  }

  return ((data ?? []) as DbTaskRow[]).map(mapTask)
}

export async function loadWorkspace(
  options: LoadWorkspaceOptions = {},
): Promise<Workspace> {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return getSignedOutWorkspace(options.signedOutMode)
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    return getSignedOutWorkspace(options.signedOutMode)
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
        .select(documentSelect)
        .order("created_at"),
    ])

  // Do not borrow demo data for a signed-in user; keep the account surface empty
  // if the read fails so auth state and visible data remain aligned.
  if (goalsRes.error) {
    return createEmptyWorkspace("supabase")
  }

  const goalRows = (goalsRes.data ?? []) as DbGoalRow[]
  const reviewRows = (reviewRes.data ?? []) as DbReviewRow[]

  // Real workspace for the signed-in user. `goals` may be empty — the dashboard
  // renders an explicit empty state instead of borrowing the demo goals.
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

export function createGoal(
  workspace: Workspace,
  input: NewGoalInput,
  clarifiedContext?: Record<string, string>,
): Workspace {
  const nextGoal = createLocalGoal(input, clarifiedContext)
  return {
    ...workspace,
    goals: [nextGoal, ...workspace.goals],
  }
}

export function deleteGoal(workspace: Workspace, goalId: string): Workspace {
  const tasks = workspace.tasks.filter((task) => task.goalId !== goalId)

  return {
    ...workspace,
    goals: workspace.goals.filter((goal) => goal.id !== goalId),
    tasks,
    aiSessions: workspace.aiSessions.filter(
      (session) => session.goalId !== goalId,
    ),
  }
}

export async function createGoalOnServer(
  input: NewGoalInput,
  clarifiedContext: Record<string, string> = {
    source: "created-from-dashboard",
  },
): Promise<Goal> {
  const { supabase, userId } = await requireSupabaseContext()
  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      target_date: input.targetDate || null,
      clarified_context: clarifiedContext,
      status: "draft",
    })
    .select(
      "id,title,description,status,target_date,clarified_context,progress_percent",
    )
    .single()

  if (error) {
    throw error
  }

  return mapGoal(data as DbGoalRow)
}

export async function deleteGoalOnServer(goalId: string): Promise<void> {
  const { supabase, userId } = await requireSupabaseContext()
  // .eq("user_id") дублирует защиту RLS (defense-in-depth), а .select() даёт
  // число затронутых строк — чтобы не показывать ложный успех при удалении 0
  // строк (чужая/несуществующая цель).
  const { data, error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("id")

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error("Цель не найдена или уже удалена.")
  }
}

export async function createStarterKnowledgeDocument(): Promise<KnowledgeDocument> {
  const context = await requireSupabaseContext()
  const { supabase, userId } = context
  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({
      user_id: userId,
      ...starterKnowledgeDocument,
    })
    .select(documentSelect)
    .single()

  if (error) {
    throw error
  }

  const document = mapDocument(data as DbDocumentRow)
  await embedKnowledgeDocument(document.id, context)

  return document
}

export async function createKnowledgeDocumentOnServer(
  input: KnowledgeDocumentInput,
): Promise<KnowledgeDocument> {
  const context = await requireSupabaseContext()
  const { supabase, userId } = context
  const normalized = normalizeKnowledgeDocumentInput(input)
  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({
      user_id: userId,
      title: normalized.title,
      source: "manual",
      content: normalized.content,
      tags: ["manual"],
      embedding_status: "pending",
      embedding_error: null,
      embedded_at: null,
    })
    .select(documentSelect)
    .single()

  if (error) {
    throw error
  }

  const document = mapDocument(data as DbDocumentRow)
  await embedKnowledgeDocument(document.id, context)

  return document
}

export async function updateKnowledgeDocumentOnServer(
  documentId: string,
  input: KnowledgeDocumentInput,
): Promise<KnowledgeDocument> {
  const context = await requireSupabaseContext()
  const { supabase, userId } = context
  const normalized = normalizeKnowledgeDocumentInput(input)
  const { data, error } = await supabase
    .from("knowledge_documents")
    .update({
      title: normalized.title,
      source: "manual",
      content: normalized.content,
      embedding_status: "pending",
      embedding_error: null,
      embedded_at: null,
    })
    .eq("id", documentId)
    .eq("user_id", userId)
    .select(documentSelect)
    .single()

  if (error) {
    throw error
  }

  const document = mapDocument(data as DbDocumentRow)
  await embedKnowledgeDocument(document.id, context)

  return document
}

export async function embedKnowledgeDocument(
  documentId: string,
  context?: SupabaseContext,
) {
  const currentContext = context ?? (await requireSupabaseContext())
  const { data, error } = await currentContext.supabase.functions.invoke(
    "embed-knowledge-document",
    {
      body: { documentId },
    },
  )

  if (error) {
    throw error
  }

  return data
}

export function toggleTask(
  workspace: Workspace,
  taskId: string,
  done: boolean,
): Workspace {
  // Осознанно бинарная модель: чекбокс переключает только todo<->done.
  // Промежуточный статус "doing" задаётся отдельным контролом и в MVP
  // намеренно не восстанавливается снятием галочки (см. UX-решение в плане).
  const nextStatus: TaskStatus = done ? "done" : "todo"
  const tasks = workspace.tasks.map((task) =>
    task.id === taskId ? { ...task, status: nextStatus } : task,
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

export async function updateTaskStatusOnServer(
  taskId: string,
  done: boolean,
): Promise<FocusTask> {
  const { supabase } = await requireSupabaseContext()
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo" })
    .eq("id", taskId)
    .select("id,goal_id,title,notes,effort,due_date,status,sort_order")
    .single()

  if (error) {
    throw error
  }

  const task = mapTask(data as DbTaskRow)
  const { data: goalTasksData, error: goalTasksError } = await supabase
    .from("tasks")
    .select("id,goal_id,title,notes,effort,due_date,status,sort_order")
    .eq("goal_id", task.goalId)

  if (goalTasksError) {
    throw goalTasksError
  }

  const progressPercent = calculateProgress(
    ((goalTasksData ?? []) as DbTaskRow[]).map(mapTask),
  )
  const { error: goalError } = await supabase
    .from("goals")
    .update({ progress_percent: progressPercent })
    .eq("id", task.goalId)

  if (goalError) {
    throw goalError
  }

  return task
}

export async function requestGoalClarification(
  input: NewGoalInput,
): Promise<ClarifyGoalResult> {
  const context = await getSupabaseContext()

  if (!context) {
    return {
      type: "clarify",
      model: "demo",
      questions: [
        "Какой конкретный результат будет считаться успехом?",
        "Сколько времени в неделю вы готовы выделять?",
        "Какие ограничения уже известны?",
        "Какая ближайшая контрольная точка?",
        "Что может сорвать план?",
      ],
      raw: "Демо-вопросы для уточнения цели.",
    }
  }

  const body = {
    goalTitle: input.title.trim(),
    description: input.description.trim(),
  }
  const { data, error } =
    await context.supabase.functions.invoke<ClarifyGoalResult>("ai-clarify", {
      body,
    })

  if (error) {
    throw error
  }

  const result = data as ClarifyGoalResult
  await saveAiSession(context, {
    type: "clarify",
    model: result.model,
    input: body,
    output: { ...result, summary: result.raw },
  })

  return result
}

export async function requestGoalPlan({
  goal,
  answers,
}: RequestGoalPlanParams): Promise<PlanGoalResult> {
  const context = await getSupabaseContext()

  if (!context) {
    return createDemoPlanResult(goal, answers)
  }

  const body = {
    goalTitle: goal.title,
    targetDate: goal.targetDate,
    answers,
  }
  const { data, error } =
    await context.supabase.functions.invoke<PlanGoalResult>("ai-plan", { body })

  if (error) {
    throw error
  }

  const result = {
    ...(data as PlanGoalResult),
    tasks: normalizeGeneratedTasks((data as PlanGoalResult).tasks),
  }
  const createdTasks = await insertGeneratedTasks(context, goal.id, result.tasks)
  await saveAiSession(context, {
    goalId: goal.id,
    type: "plan",
    model: result.model,
    input: body,
    output: {
      ...result,
      taskCount: createdTasks.length,
      summary: result.plan,
    },
  })

  return result
}

export async function generateTasksForGoal(
  workspace: Workspace,
  goalId: string,
): Promise<GenerateTasksForGoalResult> {
  const goal = workspace.goals.find((item) => item.id === goalId)

  if (!goal) {
    throw new Error("Цель не найдена.")
  }

  if (getGoalTasks(goalId, workspace.tasks).length > 0) {
    throw new Error("У этой цели уже есть задачи.")
  }

  const context = await getSupabaseContext()
  const answers = goal.clarifiedContext

  if (!context) {
    const result = createDemoPlanResult(goal, answers)
    return {
      result,
      tasks: createDemoTasksForGoal(goal.id, result.tasks),
    }
  }

  const body = {
    goalTitle: goal.title,
    targetDate: goal.targetDate,
    answers,
  }
  const { data, error } =
    await context.supabase.functions.invoke<PlanGoalResult>("ai-plan", { body })

  if (error) {
    throw error
  }

  const result = {
    ...(data as PlanGoalResult),
    tasks: normalizeGeneratedTasks((data as PlanGoalResult).tasks),
  }
  const tasks = await insertGeneratedTasks(context, goal.id, result.tasks)
  await saveAiSession(context, {
    goalId: goal.id,
    type: "plan",
    model: result.model,
    input: body,
    output: {
      ...result,
      taskCount: tasks.length,
      summary: result.plan,
    },
  })

  return { result, tasks }
}

export async function requestRagAnswer({
  question,
  documents,
  selectedDocumentId,
}: RequestRagAnswerParams): Promise<RagAnswerResult> {
  const cleanQuestion = question.trim()
  if (cleanQuestion.length < 5) {
    throw new Error("Введите вопрос по заметкам.")
  }

  if (documents.length === 0) {
    throw new Error("Нет документов для RAG-ответа.")
  }

  const context = await getSupabaseContext()
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ??
    documents[0]

  if (!context) {
    return {
      type: "rag-answer",
      model: "demo",
      answer: `По документу «${selectedDocument.title}»: неделя 8 содержит самую длинную пробежку — 15 км. Источник: ${selectedDocument.title}.`,
      citations: [
        {
          documentId: selectedDocument.id,
          title: selectedDocument.title,
          source: selectedDocument.source,
          chunkIndex: 0,
          similarity: 1,
          content: selectedDocument.content,
        },
      ],
      retrieval: {
        matchCount: 1,
        threshold: 1,
        embeddingModel: "demo",
      },
    }
  }

  const body = {
    question: cleanQuestion,
    selectedDocumentId: selectedDocument.id,
  }
  const { data, error } =
    await context.supabase.functions.invoke<RagAnswerResult>("rag-answer", {
      body,
    })

  if (error) {
    throw error
  }

  const result = data as RagAnswerResult
  await saveAiSession(context, {
    type: "rag",
    model: result.model,
    input: body,
    output: { ...result, summary: result.answer },
  })

  return result
}

export async function requestWeeklyReview(
  workspace: Workspace,
  goalId: string,
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
    const context = await getSupabaseContext()
    // weekStart НИКОГДА не отправляем пустым: серверная валидация требует
    // непустую строку, а до первого сохранённого обзора он равен "".
    const weekStart = workspace.weeklyReview.weekStart || currentWeekStart()
    const { data, error } = await supabase.functions.invoke(
      "ai-weekly-review",
      {
        body: {
          weekStart,
          completedTasks,
          blockedTasks,
          goalProgress: goal?.progressPercent ?? 0,
        },
      },
    )

    if (!error && data?.review) {
      if (context) {
        const { error: reviewError } = await context.supabase
          .from("weekly_reviews")
          .upsert(
            {
              user_id: context.userId,
              week_start: weekStart,
              summary: data.review,
              recommendations: [],
              risks: [],
            },
            { onConflict: "user_id,week_start" },
          )

        if (reviewError) {
          throw reviewError
        }

        await saveAiSession(context, {
          goalId,
          type: "review",
          model: data.model ?? "google/gemini-2.5-flash-lite",
          input: {
            weekStart,
            completedTasks,
            blockedTasks,
            goalProgress: goal?.progressPercent ?? 0,
          },
          output: {
            type: "weekly-review",
            summary: data.review,
            review: data.review,
          },
        })
      }

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
