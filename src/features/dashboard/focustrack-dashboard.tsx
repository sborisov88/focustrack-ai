import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  CompassIcon,
  DatabaseIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCcwIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react"

import {
  anonymousWorkspace,
  createGoal,
  createGoalOnServer,
  createLocalGoal,
  loadWorkspace,
  requestGoalClarification,
  requestGoalPlan,
  requestRagAnswer,
  requestWeeklyReview,
  toggleTask,
  updateTaskStatusOnServer,
} from "@/lib/focustrack-api"
import { signInWithOAuth, signInWithPassword, signOut } from "@/lib/auth"
import { getSupabaseClient } from "@/lib/supabase"
import { useMountEffect } from "@/hooks/use-mount-effect"
import { trackEvent } from "@/lib/analytics"
import type {
  AiSession,
  FocusTask,
  Goal,
  NewGoalInput,
  WorkspaceMode,
  Workspace,
} from "@/lib/domain"
import { demoWorkspace } from "@/lib/demo-data"
import { getEffortLabel, getGoalTasks, getStatusLabel } from "@/lib/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"

const workspaceQueryKey = ["focustrack-workspace"] as const
type WorkspaceQueryIdentity = "anonymous" | "demo" | `user:${string}`
type WorkspaceQueryKey = readonly [
  "focustrack-workspace",
  WorkspaceQueryIdentity,
]

function getWorkspaceQueryKey(
  identity: WorkspaceQueryIdentity,
): WorkspaceQueryKey {
  return ["focustrack-workspace", identity] as const
}

function getModeLabel(mode: WorkspaceMode) {
  if (mode === "supabase") return "Supabase подключен"
  if (mode === "demo") return "Демо-режим"
  return "Вход не выполнен"
}

const supabaseWorkspacePlaceholder: Workspace = {
  ...anonymousWorkspace,
  mode: "supabase",
}

const chartConfig = {
  progress: {
    label: "Прогресс",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const navItems = [
  { id: "overview", label: "Обзор", icon: LayoutDashboardIcon },
  { id: "goals", label: "Цели", icon: TargetIcon },
  { id: "tasks", label: "Задачи", icon: ClipboardListIcon },
  { id: "ai-plan", label: "AI-план", icon: SparklesIcon },
  { id: "reviews", label: "Обзоры", icon: BarChart3Icon },
]

function statusVariant(status: Goal["status"] | FocusTask["status"]) {
  if (status === "done" || status === "completed") return "default"
  if (status === "blocked") return "destructive"
  if (status === "doing" || status === "active") return "secondary"
  return "outline"
}

function getAiSessionTypeLabel(type: AiSession["type"]) {
  const labels: Record<AiSession["type"], string> = {
    clarify: "AI-уточнение",
    plan: "AI-план",
    review: "AI-ревью",
    rag: "RAG-ответ",
  }

  return labels[type]
}

function getAiSessionStatusLabel(status: AiSession["status"]) {
  const labels: Record<AiSession["status"], string> = {
    queued: "В очереди",
    completed: "Готово",
    failed: "Ошибка",
  }

  return labels[status]
}

function buildClarifiedContext(
  questions: string[],
  answers: Record<string, string>,
) {
  return Object.fromEntries(
    questions.map((question) => [question, answers[question]?.trim() ?? ""]),
  )
}

function updateWorkspace(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: WorkspaceQueryKey,
  updater: (workspace: Workspace) => Workspace,
) {
  queryClient.setQueryData<Workspace>(queryKey, (current) =>
    updater(current ?? anonymousWorkspace),
  )
}

type GoalCreationStep = "draft" | "answering" | "planned"

function CreateGoalDialog({
  workspace,
  queryKey,
}: {
  workspace: Workspace
  queryKey: WorkspaceQueryKey
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewGoalInput>({
    title: "",
    description: "",
    targetDate: "2026-07-20",
  })
  const [step, setStep] = useState<GoalCreationStep>("draft")
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [plan, setPlan] = useState("")
  const queryClient = useQueryClient()
  const canSubmit = draft.title.trim().length >= 3
  const hasQuestions = questions.length > 0
  const canPlan =
    hasQuestions &&
    questions.every((question) => (answers[question] ?? "").trim().length >= 2)

  const resetForm = () => {
    setDraft({ title: "", description: "", targetDate: "2026-07-20" })
    setStep("draft")
    setQuestions([])
    setAnswers({})
    setPlan("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetForm()
    }
  }

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      const currentWorkspace =
        queryClient.getQueryData<Workspace>(queryKey) ?? workspace

      if (currentWorkspace.mode === "supabase") {
        const goal = await createGoalOnServer(draft)
        return { mode: "supabase" as const, goal }
      }

      const nextWorkspace = createGoal(currentWorkspace, draft)
      return { mode: "demo" as const, workspace: nextWorkspace }
    },
    onSuccess: async (result) => {
      if (result.mode === "supabase") {
        await queryClient.invalidateQueries({ queryKey })
      } else {
        queryClient.setQueryData(queryKey, result.workspace)
      }

      trackEvent({ name: "goal_created", params: { source: "dashboard" } })
      toast.success("Цель добавлена")
      handleOpenChange(false)
    },
    onError: (error) => {
      toast.error("Цель не добавлена", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })

  const clarifyMutation = useMutation({
    mutationFn: () => requestGoalClarification(draft),
    onSuccess: (result) => {
      setQuestions(result.questions)
      setAnswers(
        Object.fromEntries(result.questions.map((question) => [question, ""])),
      )
      setStep("answering")
      trackEvent({ name: "ai_clarify_completed", params: {} })
    },
    onError: (error) => {
      toast.error("AI-уточнение не выполнено", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })

  const planMutation = useMutation({
    mutationFn: async () => {
      const currentWorkspace =
        queryClient.getQueryData<Workspace>(queryKey) ?? workspace
      const clarifiedContext = buildClarifiedContext(questions, answers)

      if (currentWorkspace.mode === "supabase") {
        const goal = await createGoalOnServer(draft, clarifiedContext)
        const result = await requestGoalPlan({ goal, answers })
        return { mode: "supabase" as const, goal, result }
      }

      const goal = createLocalGoal(draft, clarifiedContext)
      const result = await requestGoalPlan({ goal, answers })
      const nextWorkspace: Workspace = {
        ...currentWorkspace,
        goals: [goal, ...currentWorkspace.goals],
        aiSessions: [
          {
            id: `session-plan-${Date.now()}`,
            goalId: goal.id,
            type: "plan",
            model: result.model,
            status: "completed",
            summary: result.plan,
            createdAt: new Date().toISOString(),
          },
          ...currentWorkspace.aiSessions,
        ],
      }

      return { mode: "demo" as const, goal, result, workspace: nextWorkspace }
    },
    onSuccess: async (result) => {
      setPlan(result.result.plan)
      setStep("planned")

      if (result.mode === "supabase") {
        await queryClient.invalidateQueries({ queryKey })
      } else {
        queryClient.setQueryData(queryKey, result.workspace)
      }

      trackEvent({
        name: "ai_plan_completed",
        params: { goalId: result.goal.id },
      })
      toast.success("AI-план готов")
    },
    onError: (error) => {
      toast.error("AI-план не сформирован", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="new-goal-button">
          <PlusIcon data-icon="inline-start" />
          Новая цель
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новая цель</DialogTitle>
          <DialogDescription>
            Пройдите AI-уточнение, получите план задач или добавьте цель сразу.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="goal-title">Название</FieldLabel>
            <Input
              id="goal-title"
              data-testid="goal-title-input"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Например, пробежать первый полумарафон"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-description">Контекст</FieldLabel>
            <Textarea
              id="goal-description"
              data-testid="goal-context-input"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Что уже есть, какой дедлайн, какие ограничения?"
            />
            <FieldDescription>
              Этот текст уйдёт в AI-уточнение и планирование.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-date">Дедлайн</FieldLabel>
            <Input
              id="goal-date"
              data-testid="goal-date-input"
              type="date"
              value={draft.targetDate}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  targetDate: event.target.value,
                }))
              }
            />
          </Field>
        </FieldGroup>
        {step === "answering" && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <div>
              <h3 className="font-medium">AI-вопросы</h3>
              <p className="text-muted-foreground text-sm">
                Ответы попадут в контекст цели и в запрос на AI-план.
              </p>
            </div>
            {questions.map((question, index) => (
              <Field key={question}>
                <FieldLabel htmlFor={`clarify-answer-${index}`}>
                  {question}
                </FieldLabel>
                <Textarea
                  id={`clarify-answer-${index}`}
                  data-testid="clarify-answer-input"
                  value={answers[question] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question]: event.target.value,
                    }))
                  }
                  placeholder="Короткий ответ для планирования"
                />
              </Field>
            ))}
          </div>
        )}
        {step === "planned" && (
          <Alert data-testid="ai-plan-result">
            <SparklesIcon />
            <AlertTitle>AI-план готов</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {plan}
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter className="sticky bottom-0 z-10">
          {step === "draft" && (
            <Button
              type="button"
              variant="outline"
              disabled={!canSubmit || createGoalMutation.isPending}
              onClick={() => createGoalMutation.mutate()}
              data-testid="goal-submit"
            >
              {createGoalMutation.isPending ? (
                <Loader2Icon data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Добавить без AI
            </Button>
          )}
          {step === "draft" && (
            <Button
              type="button"
              disabled={!canSubmit || clarifyMutation.isPending}
              onClick={() => clarifyMutation.mutate()}
              data-testid="goal-clarify-button"
            >
              {clarifyMutation.isPending ? (
                <Loader2Icon data-icon="inline-start" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              Уточнить с AI
            </Button>
          )}
          {step === "answering" && (
            <Button
              type="button"
              disabled={!canPlan || planMutation.isPending}
              onClick={() => planMutation.mutate()}
              data-testid="goal-plan-button"
            >
              {planMutation.isPending ? (
                <Loader2Icon data-icon="inline-start" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              Сформировать AI-план
            </Button>
          )}
          <Button
            type="button"
            variant={step === "planned" ? "default" : "ghost"}
            onClick={() => handleOpenChange(false)}
          >
            {step === "planned" ? "Готово" : "Закрыть"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AuthButtons() {
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)

    try {
      await signInWithOAuth("google")
      trackEvent({ name: "oauth_started", params: { provider: "google" } })
    } catch (error) {
      toast.error("OAuth вход не запущен", {
        description: error instanceof Error ? error.message : String(error),
      })
      setIsSigningIn(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSigningIn}
          onClick={handleGoogleSignIn}
          data-testid="google-signin-button"
        >
          {isSigningIn ? (
            <Loader2Icon data-icon="inline-start" />
          ) : (
            <LogInIcon data-icon="inline-start" />
          )}
          Google
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        OAuth проходит через Supabase Auth; секрет провайдера не хранится во
        frontend.
      </TooltipContent>
    </Tooltip>
  )
}

type AuthState = {
  email: string | null
  userId: string | null
  ready: boolean
}

function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>({
    email: null,
    userId: null,
    ready: false,
  })
  const queryClient = useQueryClient()

  useMountEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setAuthState({ email: null, userId: null, ready: true })
      return
    }

    void supabase.auth
      .getSession()
      .then(({ data }) =>
        setAuthState({
          email: data.session?.user.email ?? null,
          userId: data.session?.user.id ?? null,
          ready: true,
        }),
      )

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        email: session?.user.email ?? null,
        userId: session?.user.id ?? null,
        ready: true,
      })
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
    })

    return () => subscription.unsubscribe()
  })

  return authState
}

function LoginDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)
  const queryClient = useQueryClient()
  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && !isPending

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsPending(true)

    try {
      await signInWithPassword(email.trim(), password)
      trackEvent({ name: "password_sign_in", params: { method: "password" } })
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
      setPassword("")
      setOpen(false)
      toast.success("Вход выполнен")
    } catch (error) {
      toast.error("Не удалось войти", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="login-trigger"
        >
          <LogInIcon data-icon="inline-start" />
          Войти
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="login-dialog">
        <DialogHeader>
          <DialogTitle>Вход по email</DialogTitle>
          <DialogDescription>
            Войдите, чтобы видеть свои цели, задачи и AI-сессии из Supabase.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                id="login-email"
                data-testid="login-email-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
              <Input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 6 символов"
              />
              <FieldDescription>
                Демо-доступ: demo@focustrack.ai
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={!canSubmit} data-testid="login-submit">
              {isPending ? (
                <Loader2Icon data-icon="inline-start" />
              ) : (
                <LogInIcon data-icon="inline-start" />
              )}
              Войти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SignedInControls({
  email,
  onSignedOut,
}: {
  email: string
  onSignedOut: () => void
}) {
  const [isPending, setIsPending] = useState(false)
  const queryClient = useQueryClient()

  const handleSignOut = async () => {
    setIsPending(true)

    try {
      await signOut()
      queryClient.removeQueries({ queryKey: workspaceQueryKey })
      queryClient.setQueryData(
        getWorkspaceQueryKey("anonymous"),
        anonymousWorkspace,
      )
      onSignedOut()
      trackEvent({ name: "sign_out", params: {} })
      toast.success("Вы вышли из аккаунта")
    } catch (error) {
      toast.error("Не удалось выйти", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="max-w-[180px] truncate"
        title={email}
        data-testid="user-email"
      >
        {email}
      </Badge>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleSignOut}
        data-testid="signout-button"
      >
        {isPending ? (
          <Loader2Icon data-icon="inline-start" />
        ) : (
          <LogOutIcon data-icon="inline-start" />
        )}
        Выйти
      </Button>
    </div>
  )
}

function AuthControls({
  authState,
  onSignedOut,
}: {
  authState: AuthState
  onSignedOut: () => void
}) {
  if (authState.email) {
    return <SignedInControls email={authState.email} onSignedOut={onSignedOut} />
  }

  return (
    <>
      <AuthButtons />
      <LoginDialog />
    </>
  )
}

function GoalList({
  goals,
  selectedGoalId,
  onSelectGoal,
}: {
  goals: Goal[]
  selectedGoalId: string
  onSelectGoal: (goalId: string) => void
}) {
  return (
    <Card data-testid="goal-list">
      <CardHeader>
        <CardTitle>Цели</CardTitle>
        <CardDescription>
          Фокус на ближайшие шаги по вашим целям.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {goals.map((goal) => (
          <button
            key={goal.id}
            type="button"
            data-testid="goal-item"
            onClick={() => onSelectGoal(goal.id)}
            className="bg-card hover:bg-accent aria-pressed:border-primary flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors"
            aria-pressed={goal.id === selectedGoalId}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium">{goal.title}</span>
              <Badge variant={statusVariant(goal.status)}>
                {getStatusLabel(goal.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {goal.description}
            </p>
            <div className="flex items-center gap-3">
              <Progress value={goal.progressPercent} />
              <span className="text-muted-foreground text-sm tabular-nums">
                {goal.progressPercent}%
              </span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

function GoalDetail({
  goal,
  tasks,
  onToggleTask,
  onRequestReview,
  isReviewPending,
}: {
  goal: Goal
  tasks: FocusTask[]
  onToggleTask: (taskId: string, done: boolean) => void
  onRequestReview: () => void
  isReviewPending: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(goal.status)}>
                {getStatusLabel(goal.status)}
              </Badge>
              <Badge variant="outline">
                <CalendarCheckIcon />
                {goal.targetDate}
              </Badge>
            </div>
            <CardTitle className="text-2xl">{goal.title}</CardTitle>
            <CardDescription>{goal.description}</CardDescription>
          </div>
          <Button
            onClick={onRequestReview}
            disabled={isReviewPending}
            data-testid="ai-review-button"
          >
            {isReviewPending ? (
              <Loader2Icon data-icon="inline-start" />
            ) : (
              <RefreshCcwIcon data-icon="inline-start" />
            )}
            AI Review
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks">Задачи</TabsTrigger>
            <TabsTrigger value="questions">AI-вопросы</TabsTrigger>
            <TabsTrigger value="timeline">Шкала</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="pt-4">
            <div className="flex flex-col gap-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  data-testid="task-item"
                  className="bg-card flex items-start gap-3 rounded-lg border p-3"
                >
                  <Checkbox
                    data-testid="task-checkbox"
                    checked={task.status === "done"}
                    onCheckedChange={(checked) =>
                      onToggleTask(task.id, checked === true)
                    }
                    aria-label={`Отметить задачу ${task.title}`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{task.title}</span>
                        <span className="text-muted-foreground text-sm">
                          {task.notes}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={statusVariant(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        <Badge variant="outline">
                          {getEffortLabel(task.effort)}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      Срок: {task.dueDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="questions" className="pt-4">
            <Alert>
              <SparklesIcon />
              <AlertTitle>AI-уточнение цели</AlertTitle>
              <AlertDescription>
                Уточнить контекст, критерии успеха, сроки и ограничения, прежде
                чем разбивать цель на задачи.
              </AlertDescription>
            </Alert>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(goal.clarifiedContext).map(([key, value]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-base">{key}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm">
                    {value}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="timeline" className="pt-4">
            <div className="grid gap-3 md:grid-cols-4">
              {tasks.slice(0, 4).map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{task.dueDate}</CardTitle>
                    <CardDescription>{task.title}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Badge variant={statusVariant(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function AiReviewPanel({
  workspace,
  goal,
}: {
  workspace: Workspace
  goal: Goal
}) {
  const latestSession = workspace.aiSessions
    .filter((session) => session.goalId === goal.id)
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))[0]

  return (
    <Card data-testid="ai-review-panel">
      <CardHeader>
        <CardTitle>AI Review</CardTitle>
        <CardDescription>
          Серверная модель: google/gemini-2.5-flash-lite.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <SparklesIcon />
          <AlertTitle>Итог недели</AlertTitle>
          <AlertDescription>{workspace.weeklyReview.summary}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2">
          {workspace.weeklyReview.recommendations.map((item) => (
            <div key={item} className="flex gap-2 text-sm">
              <CheckCircle2Icon className="text-primary mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Риски</span>
          {workspace.weeklyReview.risks.map((risk) => (
            <Badge
              key={risk}
              variant="outline"
              className="h-auto max-w-full text-left leading-relaxed whitespace-normal"
            >
              {risk}
            </Badge>
          ))}
        </div>
        {latestSession && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Последняя сессия</CardTitle>
              <CardDescription>{latestSession.model}</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {latestSession.summary}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}

function ProgressChart({ goals }: { goals: Goal[] }) {
  const data = goals.map((goal) => ({
    name: goal.title,
    progress: goal.progressPercent,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Прогресс по целям</CardTitle>
        <CardDescription>Срез для демо и еженедельного review.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide domain={[0, 100]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="progress" fill="var(--color-progress)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function SessionsTable({ workspace }: { workspace: Workspace }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-сессии и проверки</CardTitle>
        <CardDescription>
          История вызовов OpenRouter и демо-ответов.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>Модель</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Краткий результат</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.aiSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{getAiSessionTypeLabel(session.type)}</TableCell>
                  <TableCell>{session.model}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(
                        session.status === "failed" ? "blocked" : "done",
                      )}
                    >
                      {getAiSessionStatusLabel(session.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">{session.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function KnowledgePanel({
  workspace,
  queryKey,
}: {
  workspace: Workspace
  queryKey: WorkspaceQueryKey
}) {
  const [question, setQuestion] = useState(
    "на какой неделе была самая длинная пробежка",
  )
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    workspace.knowledgeDocuments[0]?.id ?? "",
  )
  const [answer, setAnswer] = useState("")
  const queryClient = useQueryClient()
  const selectedDocument =
    workspace.knowledgeDocuments.find(
      (document) => document.id === selectedDocumentId,
    ) ?? workspace.knowledgeDocuments[0]
  const canAsk =
    question.trim().length >= 5 && workspace.knowledgeDocuments.length > 0
  const ragMutation = useMutation({
    mutationFn: () =>
      requestRagAnswer({
        question,
        documents: selectedDocument
          ? [selectedDocument]
          : workspace.knowledgeDocuments,
        selectedDocumentId: selectedDocument?.id,
      }),
    onSuccess: async (result) => {
      setAnswer(result.answer)
      await queryClient.invalidateQueries({ queryKey })
      trackEvent({ name: "rag_answer_completed", params: {} })
    },
    onError: (error) => {
      toast.error("RAG-ответ не получен", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })

  return (
    <Card data-testid="knowledge-panel">
      <CardHeader>
        <CardTitle>Knowledge/RAG</CardTitle>
        <CardDescription>
          Ответы по вашим заметкам и истории целей.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="rag-source">Источник</FieldLabel>
            <Select
              value={selectedDocument?.id ?? ""}
              onValueChange={setSelectedDocumentId}
            >
              <SelectTrigger id="rag-source" data-testid="rag-source-select">
                <SelectValue placeholder="Источник знаний" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {workspace.knowledgeDocuments.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="rag-question">Вопрос по заметкам</FieldLabel>
            <Textarea
              id="rag-question"
              data-testid="rag-question-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Например, на какой неделе была самая длинная пробежка?"
            />
          </Field>
          <Button
            type="button"
            disabled={!canAsk || ragMutation.isPending}
            onClick={() => ragMutation.mutate()}
            data-testid="rag-submit"
          >
            {ragMutation.isPending ? (
              <Loader2Icon data-icon="inline-start" />
            ) : (
              <BookOpenIcon data-icon="inline-start" />
            )}
            Спросить по заметкам
          </Button>
        </FieldGroup>
        {answer && (
          <Alert data-testid="rag-answer">
            <BookOpenIcon />
            <AlertTitle>Ответ по заметкам</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {answer}
            </AlertDescription>
          </Alert>
        )}
        {workspace.knowledgeDocuments.map((document) => (
          <div key={document.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{document.title}</span>
              <Badge variant="outline">{document.source}</Badge>
            </div>
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
              {document.content}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function AnonymousWorkspaceEmptyState({
  onShowDemo,
}: {
  onShowDemo: () => void
}) {
  return (
    <main id="overview" className="p-4">
      <Card data-testid="signed-out-empty-state">
        <CardHeader>
          <CardTitle>Войдите, чтобы видеть свои цели</CardTitle>
          <CardDescription>
            После выхода FocusTrack AI очищает рабочее пространство в браузере:
            цели, задачи, AI-сессии и документы аккаунта не показываются.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onShowDemo}
            data-testid="show-demo-empty-button"
          >
            <SparklesIcon data-icon="inline-start" />
            Посмотреть демо
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export function FocusTrackDashboard() {
  const queryClient = useQueryClient()
  const authState = useAuthState()
  const [signedOutMode, setSignedOutMode] =
    useState<WorkspaceQueryIdentity>("anonymous")
  const workspaceIdentity: WorkspaceQueryIdentity = authState.userId
    ? `user:${authState.userId}`
    : signedOutMode
  const currentWorkspaceQueryKey = getWorkspaceQueryKey(workspaceIdentity)
  const workspaceFallback =
    workspaceIdentity === "demo"
      ? demoWorkspace
      : authState.userId
        ? supabaseWorkspacePlaceholder
        : anonymousWorkspace
  const workspaceQuery = useQuery({
    queryKey: currentWorkspaceQueryKey,
    queryFn: () =>
      loadWorkspace({
        signedOutMode: signedOutMode === "demo" ? "demo" : "anonymous",
      }),
    placeholderData: workspaceFallback,
    enabled: authState.ready,
  })
  const workspace = workspaceQuery.data ?? workspaceFallback
  const [selectedGoalId, setSelectedGoalId] = useState(
    workspace.goals[0]?.id ?? "",
  )
  const [activeNavItemId, setActiveNavItemId] = useState(navItems[0].id)
  const selectedGoal =
    workspace.goals.find((goal) => goal.id === selectedGoalId) ??
    workspace.goals[0]
  const selectedTasks = useMemo(
    () =>
      selectedGoal ? getGoalTasks(selectedGoal.id, workspace.tasks) : [],
    [selectedGoal, workspace.tasks],
  )
  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!selectedGoal) {
        throw new Error("Выберите цель для недельного обзора.")
      }
      return requestWeeklyReview(workspace, selectedGoal.id)
    },
    onSuccess: async (session) => {
      if (workspace.mode === "supabase") {
        await queryClient.invalidateQueries({ queryKey: currentWorkspaceQueryKey })
      } else {
        updateWorkspace(queryClient, currentWorkspaceQueryKey, (current) => ({
          ...current,
          aiSessions: [session, ...current.aiSessions],
        }))
      }
      trackEvent({
        name: "weekly_review_completed",
        params: { goalId: selectedGoal?.id ?? "" },
      })
    },
    onError: (error) => {
      toast.error("AI Review не выполнен", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
  const taskMutation = useMutation({
    mutationFn: async ({
      taskId,
      done,
    }: {
      taskId: string
      done: boolean
    }) => {
      const currentWorkspace =
        queryClient.getQueryData<Workspace>(currentWorkspaceQueryKey) ??
        workspace

      if (currentWorkspace.mode === "supabase") {
        await updateTaskStatusOnServer(taskId, done)
      }

      return { taskId, done, mode: currentWorkspace.mode }
    },
    onSuccess: async (result) => {
      if (result.mode === "supabase") {
        await queryClient.invalidateQueries({ queryKey: currentWorkspaceQueryKey })
      }
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: currentWorkspaceQueryKey })
      toast.error("Статус задачи не сохранён", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
  const doneCount = workspace.tasks.filter(
    (task) => task.status === "done",
  ).length
  const blockedCount = workspace.tasks.filter(
    (task) => task.status === "blocked",
  ).length

  const handleToggleTask = (taskId: string, done: boolean) => {
    updateWorkspace(queryClient, currentWorkspaceQueryKey, (current) =>
      toggleTask(current, taskId, done),
    )
    taskMutation.mutate({ taskId, done })
    trackEvent({ name: "task_toggled", params: { taskId, done } })
  }

  const handleShowDemo = () => {
    setSignedOutMode("demo")
    setSelectedGoalId("")
    queryClient.setQueryData(getWorkspaceQueryKey("demo"), demoWorkspace)
    trackEvent({ name: "demo_mode_opened", params: {} })
  }

  const handleSignedOut = () => {
    setSignedOutMode("anonymous")
    setSelectedGoalId("")
  }

  const handleNavigate = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
    setActiveNavItemId(sectionId)
    trackEvent({ name: "sidebar_navigation_clicked", params: { sectionId } })
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <CompassIcon />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">FocusTrack AI</span>
              <span className="text-muted-foreground truncate text-xs">
                Личный планировщик
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      type="button"
                      data-testid={`nav-${id}`}
                      isActive={id === activeNavItemId}
                      onClick={() => handleNavigate(id)}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Инфраструктура</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Статусные индикаторы режима и провайдера — не действия, поэтому
                  рендерятся как обычные строки, а не кликабельные кнопки. */}
              <div className="text-muted-foreground flex flex-col gap-1 px-2 py-1 text-sm">
                <div className="flex items-center gap-2">
                  <DatabaseIcon className="size-4" />
                  <span>{getModeLabel(workspace.mode)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4" />
                  <span>OpenRouter</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-2">
            <Badge variant="outline" data-testid="sidebar-tagline">
              AI-планировщик целей
            </Badge>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <header className="bg-background/95 sticky top-0 border-b backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div>
                  <h1
                    className="text-xl font-semibold tracking-normal"
                    data-testid="workspace-title"
                  >
                    Рабочее пространство FocusTrack AI
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Цели, задачи, AI-планирование и weekly review в одном
                    сценарии.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" data-testid="mode-badge">
                      <DatabaseIcon />
                      {getModeLabel(workspace.mode)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Браузер не хранит OpenRouter API key; AI работает через Edge
                    Functions.
                  </TooltipContent>
                </Tooltip>
                {workspace.mode === "anonymous" && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleShowDemo}
                    data-testid="show-demo-button"
                  >
                    <SparklesIcon data-icon="inline-start" />
                    Посмотреть демо
                  </Button>
                )}
                <AuthControls
                  authState={authState}
                  onSignedOut={handleSignedOut}
                />
                {workspace.mode !== "anonymous" && (
                  <CreateGoalDialog
                    workspace={workspace}
                    queryKey={currentWorkspaceQueryKey}
                  />
                )}
              </div>
            </div>
          </header>
          <ScrollArea className="flex-1">
            {workspace.mode === "anonymous" ? (
              <AnonymousWorkspaceEmptyState onShowDemo={handleShowDemo} />
            ) : (
              <>
                {workspace.mode === "demo" && (
                  <div className="px-4 pt-4">
                    <Alert data-testid="demo-banner">
                      <SparklesIcon />
                      <AlertTitle>Демо-режим</AlertTitle>
                      <AlertDescription>
                        Изменения не сохраняются. Войдите, чтобы вести свои цели
                        и задачи в своём аккаунте — они будут видны только вам.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                <main
                  id="overview"
                  className="grid scroll-mt-4 gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]"
                >
              <section id="goals" className="flex scroll-mt-4 flex-col gap-4">
                <GoalList
                  goals={workspace.goals}
                  selectedGoalId={selectedGoal?.id ?? ""}
                  onSelectGoal={setSelectedGoalId}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Метрики</CardTitle>
                    <CardDescription>Краткая сводка по целям.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <MetricCard
                      icon={TargetIcon}
                      label="Цели"
                      value={workspace.goals.length}
                    />
                    <MetricCard
                      icon={CheckCircle2Icon}
                      label="Готово"
                      value={doneCount}
                    />
                    <MetricCard
                      icon={GaugeIcon}
                      label="Блокеры"
                      value={blockedCount}
                    />
                    <MetricCard
                      icon={BookOpenIcon}
                      label="Документы"
                      value={workspace.knowledgeDocuments.length}
                    />
                  </CardContent>
                </Card>
              </section>
              <section className="flex min-w-0 flex-col gap-4">
                <div id="tasks" className="scroll-mt-4">
                  {selectedGoal ? (
                    <GoalDetail
                      goal={selectedGoal}
                      tasks={selectedTasks}
                      onToggleTask={handleToggleTask}
                      onRequestReview={() => reviewMutation.mutate()}
                      isReviewPending={reviewMutation.isPending}
                    />
                  ) : (
                    <Card data-testid="empty-state">
                      <CardHeader>
                        <CardTitle>У вас пока нет целей</CardTitle>
                        <CardDescription>
                          Создайте первую цель — она сохранится в вашем аккаунте
                          и будет видна только вам.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CreateGoalDialog
                          workspace={workspace}
                          queryKey={currentWorkspaceQueryKey}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ProgressChart goals={workspace.goals} />
                  <KnowledgePanel
                    workspace={workspace}
                    queryKey={currentWorkspaceQueryKey}
                  />
                </div>
                <div id="reviews" className="scroll-mt-4">
                  <SessionsTable workspace={workspace} />
                </div>
              </section>
              <aside className="flex flex-col gap-4">
                <div id="ai-plan" className="scroll-mt-4">
                  {selectedGoal && (
                    <AiReviewPanel workspace={workspace} goal={selectedGoal} />
                  )}
                </div>
                <Card data-testid="categories-card">
                  <CardHeader>
                    <CardTitle>Категории целей</CardTitle>
                    <CardDescription>
                      Баланс направлений и источники для AI-ответов.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {[
                      ["Здоровье", "Полумарафон"],
                      ["Карьера", "IELTS 7.0"],
                      ["Финансы", "Подушка 6 мес"],
                      ["Проект", "Лендинг"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm font-medium">{label}</span>
                        <Badge variant="outline">{value}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </aside>
                </main>
              </>
            )}
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType
  label: string
  value: number
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">{label}</span>
        <Icon />
      </div>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  )
}
