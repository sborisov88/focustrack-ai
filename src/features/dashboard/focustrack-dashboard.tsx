import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { motion } from "motion/react"
import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  CompassIcon,
  DatabaseIcon,
  FileQuestionIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  Loader2Icon,
  PlusIcon,
  RadarIcon,
  RefreshCcwIcon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserPlusIcon,
} from "lucide-react"

import {
  anonymousWorkspace,
  createGoal,
  createGoalOnServer,
  createLocalGoal,
  deleteGoal,
  deleteGoalOnServer,
  generateTasksForGoal,
  loadWorkspace,
  requestGoalClarification,
  requestGoalPlan,
  requestRagAnswer,
  requestWeeklyReview,
  toggleTask,
  updateTaskStatusOnServer,
} from "@/lib/focustrack-api"
import {
  getOAuthErrorMessage,
  getPasswordAuthErrorMessage,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/lib/auth"
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
import {
  calculateCurrentStreakDays,
  getEffortLabel,
  getGoalTasks,
  getStatusLabel,
} from "@/lib/progress"
import { cn } from "@/lib/utils"
import { withViewTransition } from "@/lib/view-transition"
import { Panel } from "@/components/telemetry/panel"
import { Sparkline } from "@/components/telemetry/sparkline"
import { StatBlock } from "@/components/telemetry/stat-block"
import { TelemetryArc } from "@/components/telemetry/telemetry-arc"
import { chartVar, deadlineLabel, goalVisual, trendSeries } from "./goal-visual"
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
  DialogClose,
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
  useSidebar,
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

type KnownAppRoute = "dashboard" | "planner" | "knowledge" | "review"
type AppRoute = KnownAppRoute | "not-found"

const navItems: Array<{
  id: KnownAppRoute
  label: string
  path: string
  icon: React.ComponentType
}> = [
  {
    id: "dashboard",
    label: "Дашборд",
    path: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  { id: "planner", label: "План", path: "/planner", icon: ClipboardListIcon },
  { id: "knowledge", label: "Заметки", path: "/knowledge", icon: BookOpenIcon },
  { id: "review", label: "Обзоры", path: "/review", icon: BarChart3Icon },
]

function getRouteFromPath(pathname: string): AppRoute {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "dashboard"
  if (pathname.startsWith("/planner")) return "planner"
  if (pathname.startsWith("/knowledge")) return "knowledge"
  if (pathname.startsWith("/review")) return "review"
  return "not-found"
}

function getRoutePath(route: KnownAppRoute) {
  return navItems.find((item) => item.id === route)?.path ?? "/dashboard"
}

function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    getRouteFromPath(globalThis.location?.pathname ?? "/"),
  )

  useMountEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath(globalThis.location.pathname))
    }

    globalThis.addEventListener("popstate", handlePopState)

    return () => globalThis.removeEventListener("popstate", handlePopState)
  })

  const navigate = (nextRoute: KnownAppRoute) => {
    const nextPath = getRoutePath(nextRoute)

    withViewTransition(() => {
      if (globalThis.location.pathname !== nextPath) {
        globalThis.history.pushState(null, "", nextPath)
      }
      setRoute(nextRoute)
    })
  }

  return { route, navigate }
}

function DashboardSidebarNav({
  route,
  onNavigate,
}: {
  route: AppRoute
  onNavigate: (route: KnownAppRoute) => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      {navItems.map(({ id, label, icon: Icon }) => (
        <SidebarMenuItem key={label}>
          <SidebarMenuButton
            type="button"
            data-testid={`nav-${id}`}
            isActive={id === route}
            onClick={() => {
              onNavigate(id)
              // На мобильном выбор пункта должен закрывать выехавшую шторку,
              // иначе она остаётся поверх контента нового маршрута.
              if (isMobile) {
                setOpenMobile(false)
              }
            }}
          >
            <Icon />
            <span>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

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
      const generatedTasks: FocusTask[] = result.tasks.map((task, index) => ({
        id: `task-${Date.now()}-${index}`,
        goalId: goal.id,
        title: task.title,
        notes: task.notes,
        effort: task.effort,
        dueDate: task.dueDate,
        status: "todo",
        sortOrder: index + 1,
      }))
      const nextWorkspace: Workspace = {
        ...currentWorkspace,
        goals: [goal, ...currentWorkspace.goals],
        tasks: [...generatedTasks, ...currentWorkspace.tasks],
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
                <Loader2Icon
                  className="animate-spin"
                  data-icon="inline-start"
                />
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
                <Loader2Icon
                  className="animate-spin"
                  data-icon="inline-start"
                />
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
                <Loader2Icon
                  className="animate-spin"
                  data-icon="inline-start"
                />
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
        description: getOAuthErrorMessage(error),
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
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
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

    void supabase.auth.getSession().then(({ data }) =>
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
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)
  const queryClient = useQueryClient()
  const hasEmail = email.trim().length > 3
  const hasValidPassword = password.length >= 6
  const canSubmit = hasEmail && hasValidPassword && !isPending
  const isSignUp = mode === "sign-up"
  const submitDisabledReason = !hasEmail
    ? "Введите email."
    : !hasValidPassword
      ? `Пароль должен быть не короче 6 символов. Сейчас: ${password.length}.`
      : undefined

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsPending(true)

    try {
      if (isSignUp) {
        const signUpResult = await signUpWithPassword(email.trim(), password)
        trackEvent({ name: "password_sign_up", params: { method: "password" } })
        await queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
        setPassword("")

        if (signUpResult.requiresEmailConfirmation) {
          setMode("sign-in")
          toast.success("Проверьте почту", {
            description:
              "Подтвердите email по письму от Supabase, затем войдите с этим паролем.",
          })
          return
        }

        setOpen(false)
        toast.success("Регистрация выполнена")
      } else {
        await signInWithPassword(email.trim(), password)
        trackEvent({ name: "password_sign_in", params: { method: "password" } })
        await queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
        setPassword("")
        setOpen(false)
        toast.success("Вход выполнен")
      }
    } catch (error) {
      toast.error(
        isSignUp ? "Не удалось зарегистрироваться" : "Не удалось войти",
        {
          description: getPasswordAuthErrorMessage(error),
        },
      )
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
      <DialogContent className="sm:max-w-md" data-testid="login-dialog">
        <DialogHeader>
          <DialogTitle>
            {isSignUp ? "Регистрация" : "Вход по email"}
          </DialogTitle>
          <DialogDescription>
            {isSignUp
              ? "Создайте аккаунт, чтобы хранить цели и AI-сессии в Supabase."
              : "Войдите, чтобы видеть свои цели, задачи и AI-сессии из Supabase."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <FieldGroup className="gap-4">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                id="login-email"
                className="bg-background h-10 rounded-md px-3 text-sm"
                data-testid="login-email-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
              <Input
                id="login-password"
                className="bg-background h-10 rounded-md px-3 text-sm"
                data-testid="login-password-input"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                aria-invalid={
                  password.length > 0 && !hasValidPassword ? true : undefined
                }
                aria-describedby={
                  password.length > 0 && !hasValidPassword
                    ? "login-password-description login-password-error"
                    : "login-password-description"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 6 символов"
              />
              <FieldDescription
                id="login-password-description"
                className="text-xs leading-relaxed"
              >
                Минимум 6 символов.{" "}
                <span className="block break-words">
                  Демо: demo@focustrack.ai / focustrack-demo
                </span>
              </FieldDescription>
              {password.length > 0 && !hasValidPassword ? (
                <FieldError
                  id="login-password-error"
                  data-testid="password-validation-message"
                >
                  Минимум 6 символов. Сейчас: {password.length}.
                </FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
              data-testid={isSignUp ? "auth-mode-signin" : "auth-mode-signup"}
            >
              {isSignUp ? "Уже есть аккаунт" : "Создать аккаунт"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              title={!canSubmit ? submitDisabledReason : undefined}
              data-testid="login-submit"
            >
              {isPending ? (
                <Loader2Icon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : isSignUp ? (
                <UserPlusIcon data-icon="inline-start" />
              ) : (
                <LogInIcon data-icon="inline-start" />
              )}
              {isSignUp ? "Зарегистрироваться" : "Войти"}
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
      trackEvent({ name: "sign_out", params: {} })
      toast.success("Вы вышли из аккаунта")
    } catch (error) {
      toast.error("Не удалось выйти", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      // Сбрасываем клиентское состояние всегда: даже если signOut() упал,
      // нельзя оставлять данные прошлого пользователя в кэше и на экране.
      queryClient.removeQueries({ queryKey: workspaceQueryKey })
      queryClient.setQueryData(
        getWorkspaceQueryKey("anonymous"),
        anonymousWorkspace,
      )
      onSignedOut()
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
          <Loader2Icon className="animate-spin" data-icon="inline-start" />
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
    return (
      <SignedInControls email={authState.email} onSignedOut={onSignedOut} />
    )
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
  tasks,
  selectedGoalId,
  onSelectGoal,
  onDeleteGoal,
  isDeletingGoal,
  columns = 2,
}: {
  goals: Goal[]
  tasks: FocusTask[]
  selectedGoalId: string
  onSelectGoal: (goalId: string) => void
  onDeleteGoal: (goalId: string) => void
  isDeletingGoal: boolean
  columns?: 1 | 2
}) {
  return (
    <section
      data-testid="goal-list"
      className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}
    >
      {goals.map((goal, index) => {
        const visual = goalVisual(goal, index)
        const color = chartVar(visual.chart)
        const Icon = visual.Icon
        const goalTasks = getGoalTasks(goal.id, tasks)
        const doneTasks = goalTasks.filter(
          (task) => task.status === "done",
        ).length
        const doingTasks = goalTasks.filter(
          (task) => task.status === "doing",
        ).length
        const nextTask =
          goalTasks.find((task) => task.status === "doing") ??
          goalTasks.find((task) => task.status === "todo") ??
          goalTasks[0]
        const active = goal.id === selectedGoalId
        return (
          <div
            key={goal.id}
            data-testid="goal-item"
            data-active={active}
            className="group tile-enter border-border bg-card data-[active=true]:border-primary relative flex flex-col overflow-hidden border transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_30px_-10px_var(--concept-glow)]"
            style={{
              backgroundImage: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, ${color} 9%, transparent), transparent 60%)`,
              animationDelay: `${(index % 6) * 70}ms`,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px] transition-[width] duration-200 group-hover:w-1.5"
              style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
            />
            <button
              type="button"
              onClick={() => onSelectGoal(goal.id)}
              aria-pressed={active}
              className="focus-visible:ring-ring flex flex-1 flex-col gap-3 p-4 pl-5 text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="concept-display inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] tracking-[0.16em] uppercase"
                  style={{
                    color,
                    borderColor: color,
                    backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
                  }}
                >
                  <Icon
                    aria-hidden
                    className="size-3 transition-transform duration-200 group-hover:scale-110"
                  />
                  {visual.category}
                </span>
                <Badge variant={statusVariant(goal.status)}>
                  {getStatusLabel(goal.status)}
                </Badge>
              </div>
              <h3 className="concept-display pr-8 text-base leading-tight font-semibold tracking-wide uppercase">
                {goal.title}
              </h3>
              <div className="flex items-center gap-3">
                <span
                  className="shrink-0"
                  style={{ viewTransitionName: `gauge-${goal.id}` }}
                >
                  <TelemetryArc
                    value={goal.progressPercent}
                    color={color}
                    delay={0.15 + index * 0.1}
                  />
                </span>
                <dl className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Готово</dt>
                    <dd
                      className="concept-tnum font-medium"
                      style={{ color: "var(--chart-5)" }}
                    >
                      {doneTasks}/{goalTasks.length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">В работе</dt>
                    <dd className="concept-tnum text-primary font-medium">
                      {doingTasks}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Срок</dt>
                    <dd className="concept-tnum text-foreground">
                      {deadlineLabel(goal.targetDate)}
                    </dd>
                  </div>
                </dl>
              </div>
              <Sparkline
                points={trendSeries(goal.progressPercent)}
                color={color}
                delay={0.25 + index * 0.1}
              />
              {nextTask ? (
                <p className="concept-mono text-muted-foreground truncate text-[11px]">
                  ▸ {nextTask.title}
                </p>
              ) : null}
            </button>
            <Dialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isDeletingGoal}
                      aria-label={`Удалить цель ${goal.title}`}
                      data-testid="delete-goal-button"
                      className="absolute top-2 right-2"
                    >
                      <Trash2Icon />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Удалить цель</TooltipContent>
              </Tooltip>
              <DialogContent data-testid="delete-goal-dialog">
                <DialogHeader>
                  <DialogTitle>Удалить цель?</DialogTitle>
                  <DialogDescription>
                    Цель «{goal.title}» и все связанные задачи будут удалены без
                    возможности восстановления.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="cancel-delete-goal-button"
                    >
                      Отмена
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isDeletingGoal}
                      onClick={() => onDeleteGoal(goal.id)}
                      data-testid="confirm-delete-goal-button"
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Удалить
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )
      })}
    </section>
  )
}

function GoalDetail({
  goal,
  tasks,
  onToggleTask,
  onRequestReview,
  onGenerateTasks,
  isReviewPending,
  isGenerateTasksPending,
}: {
  goal: Goal
  tasks: FocusTask[]
  onToggleTask: (taskId: string, done: boolean) => void
  onRequestReview: () => void
  onGenerateTasks: () => void
  isReviewPending: boolean
  isGenerateTasksPending: boolean
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
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCcwIcon data-icon="inline-start" />
            )}
            Обзор недели
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
          <TabsContent
            value="tasks"
            className="animate-in fade-in pt-4 duration-200"
          >
            <div className="flex flex-col gap-3">
              {tasks.length === 0 ? (
                <Alert data-testid="empty-tasks-state">
                  <SparklesIcon />
                  <AlertTitle>Задач пока нет</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3">
                    <span>
                      Сгенерируйте первый набор задач из контекста цели и
                      дедлайна.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={onGenerateTasks}
                      disabled={isGenerateTasksPending}
                      data-testid="generate-tasks-button"
                      className="self-start"
                    >
                      {isGenerateTasksPending ? (
                        <Loader2Icon
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <SparklesIcon data-icon="inline-start" />
                      )}
                      Сгенерировать задачи
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  data-testid="task-item"
                  className="bg-card hover:border-primary/40 hover:bg-muted/30 flex items-start gap-3 rounded-lg border p-3 transition-colors duration-200"
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
          <TabsContent
            value="questions"
            className="animate-in fade-in pt-4 duration-200"
          >
            <Alert>
              <SparklesIcon />
              <AlertTitle>Контекст цели, уточнённый с AI</AlertTitle>
              <AlertDescription>
                Контекст, критерии успеха, сроки и ограничения, уточнённые при
                создании цели и использованные для разбивки на задачи.
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
          <TabsContent
            value="timeline"
            className="animate-in fade-in pt-4 duration-200"
          >
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
        <CardTitle>Обзор недели</CardTitle>
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
        <div className="flex flex-col gap-1.5">
          <span className="concept-display text-muted-foreground text-xs tracking-[0.16em] uppercase">
            Рекомендации
          </span>
          {workspace.weeklyReview.recommendations.map((item) => (
            <div key={item} className="flex gap-2 text-sm">
              <CheckCircle2Icon className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex flex-col gap-1.5">
          <span className="concept-display text-destructive text-xs tracking-[0.16em] uppercase">
            Риски
          </span>
          {workspace.weeklyReview.risks.map((risk) => (
            <div
              key={risk}
              className="text-muted-foreground flex gap-2 text-sm leading-relaxed"
            >
              <TriangleAlertIcon className="text-destructive mt-0.5 size-4 shrink-0" />
              <span>{risk}</span>
            </div>
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

// Custom bar shape: each bar is a motion.rect that grows from the baseline,
// staggered by its data index for a left-to-right "wave". recharts' own
// animation is disabled (isAnimationActive={false}) so motion drives it.
type MotionBarProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  index?: number
}

function MotionBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  index = 0,
}: MotionBarProps) {
  return (
    <motion.rect
      x={x}
      width={width}
      rx={3}
      fill={fill}
      initial={{ height: 0, y: y + height }}
      animate={{ height, y }}
      transition={{
        delay: 0.1 + index * 0.09,
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
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
            <Bar
              dataKey="progress"
              fill="var(--color-progress)"
              isAnimationActive={false}
              shape={<MotionBar />}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function SessionsTable({ workspace }: { workspace: Workspace }) {
  return (
    <Card className="reveal-on-scroll">
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
                <TableHead className="concept-display text-xs tracking-[0.14em] uppercase">
                  Тип
                </TableHead>
                <TableHead className="concept-display text-xs tracking-[0.14em] uppercase">
                  Модель
                </TableHead>
                <TableHead className="concept-display text-xs tracking-[0.14em] uppercase">
                  Статус
                </TableHead>
                <TableHead className="concept-display text-xs tracking-[0.14em] uppercase">
                  Краткий результат
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.aiSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="concept-display tracking-wide uppercase">
                    {getAiSessionTypeLabel(session.type)}
                  </TableCell>
                  <TableCell className="concept-mono text-xs">
                    {session.model}
                  </TableCell>
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
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
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

function WorkspaceLoadingState() {
  return (
    <main className="p-4" data-testid="workspace-loading-state">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2Icon className="animate-spin" />
            Загружаем рабочее пространство
          </CardTitle>
          <CardDescription>
            Проверяем сессию, цели, задачи и документы в Supabase.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}

function WorkspaceErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="p-4" data-testid="workspace-error-state">
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>Рабочее пространство не загружено</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3">
          <span>
            Не удалось получить актуальные цели и задачи. Можно повторить запрос
            без перезагрузки страницы.
          </span>
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={onRetry}
            data-testid="workspace-retry-button"
          >
            <RefreshCcwIcon data-icon="inline-start" />
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  )
}

function RouteNotFoundState({ onGoDashboard }: { onGoDashboard: () => void }) {
  return (
    <main className="flex min-h-[60svh] items-center justify-center p-4">
      <Card className="w-full max-w-xl" data-testid="route-not-found">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestionIcon />
            Страница не найдена
          </CardTitle>
          <CardDescription>
            Такого раздела в FocusTrack AI нет. Вернитесь в рабочее
            пространство, чтобы продолжить с целями и задачами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="secondary"
            onClick={onGoDashboard}
            data-testid="not-found-dashboard-button"
          >
            <LayoutDashboardIcon data-icon="inline-start" />
            Открыть дашборд
          </Button>
        </CardContent>
      </Card>
    </main>
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
  const { route, navigate } = useAppRoute()
  const [signedOutMode, setSignedOutMode] =
    useState<WorkspaceQueryIdentity>("anonymous")
  const [previousUserId, setPreviousUserId] = useState<string | null>(
    authState.userId,
  )
  // При входе пользователя сбрасываем демо-предпросмотр на anonymous, чтобы
  // последующий авто-логаут (например, по истёкшему токену) вернул пустое
  // signed-out состояние, а не демо-данные. Это паттерн "adjust state during
  // render" из React — без useEffect.
  if (authState.userId !== previousUserId) {
    setPreviousUserId(authState.userId)
    if (authState.userId) {
      setSignedOutMode("anonymous")
    }
  }
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
  const selectedGoal =
    workspace.goals.find((goal) => goal.id === selectedGoalId) ??
    workspace.goals[0]
  const selectedTasks = useMemo(
    () => (selectedGoal ? getGoalTasks(selectedGoal.id, workspace.tasks) : []),
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
        await queryClient.invalidateQueries({
          queryKey: currentWorkspaceQueryKey,
        })
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
      toast.error("Обзор недели не выполнен", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGoal) {
        throw new Error("Выберите цель для генерации задач.")
      }

      const currentWorkspace =
        queryClient.getQueryData<Workspace>(currentWorkspaceQueryKey) ??
        workspace
      const result = await generateTasksForGoal(
        currentWorkspace,
        selectedGoal.id,
      )

      return {
        goalId: selectedGoal.id,
        mode: currentWorkspace.mode,
        ...result,
      }
    },
    onSuccess: async ({ goalId, mode, result, tasks }) => {
      if (mode === "supabase") {
        await queryClient.invalidateQueries({
          queryKey: currentWorkspaceQueryKey,
        })
      } else {
        updateWorkspace(queryClient, currentWorkspaceQueryKey, (current) => ({
          ...current,
          tasks: [...tasks, ...current.tasks],
          aiSessions: [
            {
              id: `session-plan-${Date.now()}`,
              goalId,
              type: "plan",
              model: result.model,
              status: "completed",
              summary: result.plan,
              createdAt: new Date().toISOString(),
            },
            ...current.aiSessions,
          ],
        }))
      }

      trackEvent({
        name: "tasks_generated",
        params: { goalId, taskCount: String(tasks.length) },
      })
      toast.success("Задачи сгенерированы")
    },
    onError: (error) => {
      toast.error("Задачи не сгенерированы", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
  const taskMutation = useMutation({
    mutationFn: async ({ taskId, done }: { taskId: string; done: boolean }) => {
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
        await queryClient.invalidateQueries({
          queryKey: currentWorkspaceQueryKey,
        })
      }
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({
        queryKey: currentWorkspaceQueryKey,
      })
      toast.error("Статус задачи не сохранён", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const currentWorkspace =
        queryClient.getQueryData<Workspace>(currentWorkspaceQueryKey) ??
        workspace

      if (currentWorkspace.mode === "supabase") {
        await deleteGoalOnServer(goalId)
        return { goalId, mode: "supabase" as const }
      }

      return {
        goalId,
        mode: "demo" as const,
        workspace: deleteGoal(currentWorkspace, goalId),
      }
    },
    onSuccess: async (result) => {
      if (result.mode === "supabase") {
        await queryClient.invalidateQueries({
          queryKey: currentWorkspaceQueryKey,
        })
      } else {
        withViewTransition(() => {
          queryClient.setQueryData(currentWorkspaceQueryKey, result.workspace)
        })
      }

      setSelectedGoalId((current) => (current === result.goalId ? "" : current))
      trackEvent({ name: "goal_deleted", params: { goalId: result.goalId } })
      toast.success("Цель удалена")
    },
    onError: (error) => {
      toast.error("Цель не удалена", {
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
  const doingCount = workspace.tasks.filter(
    (task) => task.status === "doing",
  ).length
  const totalTasks = workspace.tasks.length
  const currentStreakDays = calculateCurrentStreakDays(workspace.tasks)
  const overallProgress = workspace.goals.length
    ? Math.round(
        workspace.goals.reduce((sum, goal) => sum + goal.progressPercent, 0) /
          workspace.goals.length,
      )
    : 0

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

  const handleHideDemo = () => {
    setSignedOutMode("anonymous")
    setSelectedGoalId("")
    trackEvent({ name: "demo_mode_closed", params: {} })
  }

  const handleNavigate = (nextRoute: KnownAppRoute) => {
    navigate(nextRoute)
    trackEvent({
      name: "sidebar_navigation_clicked",
      params: { route: nextRoute },
    })
  }

  // On the planner the detail panel swaps when a goal is picked — morph it.
  // On the dashboard selection only toggles a highlight, so keep that instant.
  const handleSelectGoal = (goalId: string) => {
    if (route === "planner") {
      withViewTransition(() => setSelectedGoalId(goalId))
    } else {
      setSelectedGoalId(goalId)
    }
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
              <DashboardSidebarNav route={route} onNavigate={handleNavigate} />
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
          <header
            className="bg-background/95 border-border sticky top-0 z-30 border-b backdrop-blur"
            data-testid="app-header"
            style={{
              backgroundImage:
                "radial-gradient(120% 160% at 100% -20%, var(--concept-glow), transparent 55%)",
            }}
          >
            <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <span
                  aria-hidden
                  className="text-primary border-primary/40 bg-primary/10 hidden size-9 shrink-0 items-center justify-center border sm:flex"
                  style={{ boxShadow: "0 0 16px var(--concept-glow)" }}
                >
                  <RadarIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="concept-mono text-muted-foreground flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase">
                    <span
                      aria-hidden
                      className="bg-primary inline-block size-1.5 animate-pulse rounded-full"
                    />
                    В эфире · {getModeLabel(workspace.mode)} ·{" "}
                    {workspace.goals.length} активные цели
                  </p>
                  <h1
                    className="concept-display text-xl font-semibold tracking-[0.04em] uppercase"
                    data-testid="workspace-title"
                  >
                    Рабочее пространство FocusTrack AI
                  </h1>
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
                {workspace.mode === "demo" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleHideDemo}
                    data-testid="hide-demo-button"
                  >
                    Скрыть демо
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
            <div className="border-border/60 flex flex-wrap items-center gap-y-2 border-t px-4 py-2.5">
              <StatBlock
                label="Общий курс"
                value={overallProgress}
                unit="%"
                accent
              />
              <StatBlock label="Серия" value={currentStreakDays} unit="дн." />
              <StatBlock label="Всего задач" value={totalTasks} />
              <StatBlock label="Готово" value={doneCount} />
              <StatBlock label="В работе" value={doingCount} />
              <StatBlock label="Блокеры" value={blockedCount} />
            </div>
          </header>
          <ScrollArea className="flex-1">
            {!authState.ready ? (
              <WorkspaceLoadingState />
            ) : route === "not-found" ? (
              <RouteNotFoundState
                onGoDashboard={() => {
                  navigate("dashboard")
                }}
              />
            ) : workspaceQuery.isLoadingError ? (
              <WorkspaceErrorState
                onRetry={() => {
                  void workspaceQuery.refetch()
                }}
              />
            ) : workspace.mode === "anonymous" ? (
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
                {workspaceQuery.isRefetchError &&
                  workspace.mode === "supabase" && (
                    <div className="px-4 pt-4">
                      <Alert
                        variant="destructive"
                        data-testid="workspace-refetch-error-banner"
                      >
                        <TriangleAlertIcon />
                        <AlertTitle>Не удалось обновить данные</AlertTitle>
                        <AlertDescription className="mt-2 flex flex-col gap-3">
                          <span>
                            Показаны последние загруженные цели и задачи —
                            фоновое обновление из Supabase не удалось.
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-fit"
                            onClick={() => {
                              void workspaceQuery.refetch()
                            }}
                            data-testid="workspace-refetch-retry-button"
                          >
                            <RefreshCcwIcon data-icon="inline-start" />
                            Обновить
                          </Button>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                {workspaceQuery.isFetching &&
                  !workspaceQuery.isError &&
                  workspace.mode === "supabase" && (
                    <div className="px-4 pt-4">
                      <Alert data-testid="workspace-loading-banner">
                        <Loader2Icon className="animate-spin" />
                        <AlertTitle>Синхронизируем данные</AlertTitle>
                        <AlertDescription>
                          Обновляем цели, задачи и AI-сессии из Supabase.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                {route === "dashboard" && (
                  <main
                    className="flex flex-col gap-4 p-4"
                    data-testid="route-dashboard"
                  >
                    <GoalList
                      goals={workspace.goals}
                      tasks={workspace.tasks}
                      selectedGoalId={selectedGoal?.id ?? ""}
                      onSelectGoal={handleSelectGoal}
                      onDeleteGoal={(goalId) =>
                        deleteGoalMutation.mutate(goalId)
                      }
                      isDeletingGoal={deleteGoalMutation.isPending}
                    />
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <Panel
                        title="Прогресс по целям"
                        icon={BarChart3Icon}
                        meta="срез по всем целям"
                        className="min-w-0"
                      >
                        <div className="p-4">
                          <ProgressChart goals={workspace.goals} />
                        </div>
                      </Panel>
                      <Card data-testid="categories-card">
                        <CardHeader>
                          <CardTitle>Категории целей</CardTitle>
                          <CardDescription>
                            Баланс направлений и источники для AI-ответов.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2.5">
                          {workspace.goals.map((goal, index) => {
                            const visual = goalVisual(goal, index)
                            return (
                              <div
                                key={goal.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <span
                                  className="concept-display shrink-0 text-xs tracking-[0.14em] uppercase"
                                  style={{ color: chartVar(visual.chart) }}
                                >
                                  {visual.category}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="min-w-0 truncate"
                                >
                                  {goal.title}
                                </Badge>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    </div>
                  </main>
                )}
                {route === "planner" && (
                  <main
                    className="grid gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)]"
                    data-testid="route-planner"
                  >
                    <GoalList
                      goals={workspace.goals}
                      tasks={workspace.tasks}
                      selectedGoalId={selectedGoal?.id ?? ""}
                      onSelectGoal={handleSelectGoal}
                      onDeleteGoal={(goalId) =>
                        deleteGoalMutation.mutate(goalId)
                      }
                      isDeletingGoal={deleteGoalMutation.isPending}
                      columns={1}
                    />
                    {selectedGoal ? (
                      <GoalDetail
                        goal={selectedGoal}
                        tasks={selectedTasks}
                        onToggleTask={handleToggleTask}
                        onRequestReview={() => reviewMutation.mutate()}
                        onGenerateTasks={() => generateTasksMutation.mutate()}
                        isReviewPending={reviewMutation.isPending}
                        isGenerateTasksPending={generateTasksMutation.isPending}
                      />
                    ) : (
                      <Card data-testid="empty-state">
                        <CardHeader>
                          <CardTitle>У вас пока нет целей</CardTitle>
                          <CardDescription>
                            Создайте первую цель — она сохранится в вашем
                            аккаунте и будет видна только вам.
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
                  </main>
                )}
                {route === "knowledge" && (
                  <main
                    className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]"
                    data-testid="route-knowledge"
                  >
                    <KnowledgePanel
                      workspace={workspace}
                      queryKey={currentWorkspaceQueryKey}
                    />
                    <Card>
                      <CardHeader>
                        <CardTitle>Источники RAG</CardTitle>
                        <CardDescription>
                          Личные заметки, на которых строится ответ модели.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        {workspace.knowledgeDocuments.map((document) => (
                          <Badge
                            key={document.id}
                            variant="outline"
                            className="h-auto justify-start whitespace-normal"
                          >
                            {document.title}
                          </Badge>
                        ))}
                      </CardContent>
                    </Card>
                  </main>
                )}
                {route === "review" && (
                  <main
                    className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_420px]"
                    data-testid="route-review"
                  >
                    <section className="flex min-w-0 flex-col gap-4">
                      {selectedGoal && (
                        <AiReviewPanel
                          workspace={workspace}
                          goal={selectedGoal}
                        />
                      )}
                      <SessionsTable workspace={workspace} />
                    </section>
                    <ProgressChart goals={workspace.goals} />
                  </main>
                )}
              </>
            )}
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
