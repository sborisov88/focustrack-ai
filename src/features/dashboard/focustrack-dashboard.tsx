import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  DatabaseIcon,
  GaugeIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LogInIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCcwIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react"

import {
  createGoal,
  loadWorkspace,
  requestWeeklyReview,
  toggleTask,
} from "@/lib/focustrack-api"
import { signInWithOAuth } from "@/lib/auth"
import { trackEvent } from "@/lib/analytics"
import type { FocusTask, Goal, NewGoalInput, Workspace } from "@/lib/domain"
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

const chartConfig = {
  progress: {
    label: "Прогресс",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const navItems = [
  { label: "Обзор", icon: LayoutDashboardIcon },
  { label: "Цели", icon: TargetIcon },
  { label: "Задачи", icon: ClipboardListIcon },
  { label: "AI-план", icon: SparklesIcon },
  { label: "Обзоры", icon: BarChart3Icon },
]

function statusVariant(status: Goal["status"] | FocusTask["status"]) {
  if (status === "done" || status === "completed") return "default"
  if (status === "blocked") return "destructive"
  if (status === "doing" || status === "active") return "secondary"
  return "outline"
}

function updateWorkspace(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (workspace: Workspace) => Workspace,
) {
  queryClient.setQueryData<Workspace>(workspaceQueryKey, (current) =>
    updater(current ?? demoWorkspace),
  )
}

function CreateGoalDialog() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewGoalInput>({
    title: "",
    description: "",
    targetDate: "2026-07-20",
  })
  const queryClient = useQueryClient()
  const canSubmit = draft.title.trim().length >= 3

  const handleSubmit = () => {
    if (!canSubmit) return

    updateWorkspace(queryClient, (workspace) => createGoal(workspace, draft))
    trackEvent({ name: "goal_created", params: { source: "dashboard" } })
    setDraft({ title: "", description: "", targetDate: "2026-07-20" })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon data-icon="inline-start" />
          Новая цель
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая цель</DialogTitle>
          <DialogDescription>
            Цель появится в демо-рабочем пространстве и будет готова для
            AI-уточнения.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="goal-title">Название</FieldLabel>
            <Input
              id="goal-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Например, подготовить защиту проекта"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-description">Контекст</FieldLabel>
            <Textarea
              id="goal-description"
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
        <DialogFooter>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            <PlusIcon data-icon="inline-start" />
            Добавить
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
    <Card>
      <CardHeader>
        <CardTitle>Цели</CardTitle>
        <CardDescription>
          Фокус на ближайшие этапы курса и проекта.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {goals.map((goal) => (
          <button
            key={goal.id}
            type="button"
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
          <Button onClick={onRequestReview} disabled={isReviewPending}>
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
                  className="bg-card flex items-start gap-3 rounded-lg border p-3"
                >
                  <Checkbox
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
              <AlertTitle>AI-уточнение перед финальным ТЗ</AlertTitle>
              <AlertDescription>
                Уточнить критерии защиты, демо-сценарий, рискованные интеграции,
                границы RAG и обязательные evidence-артефакты.
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
    <Card>
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
    name: goal.title.replace("Домашние задания ", "ДЗ "),
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
                  <TableCell>{session.type}</TableCell>
                  <TableCell>{session.model}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(
                        session.status === "failed" ? "blocked" : "done",
                      )}
                    >
                      {session.status}
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

function KnowledgePanel({ workspace }: { workspace: Workspace }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge/RAG</CardTitle>
        <CardDescription>
          Минимальный эксперимент для ДЗ 6: ответы по документам проекта.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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

export function FocusTrackDashboard() {
  const queryClient = useQueryClient()
  const workspaceQuery = useQuery({
    queryKey: workspaceQueryKey,
    queryFn: loadWorkspace,
    initialData: demoWorkspace,
  })
  const workspace = workspaceQuery.data
  const [selectedGoalId, setSelectedGoalId] = useState(workspace.goals[0].id)
  const selectedGoal =
    workspace.goals.find((goal) => goal.id === selectedGoalId) ??
    workspace.goals[0]
  const selectedTasks = useMemo(
    () => getGoalTasks(selectedGoal.id, workspace.tasks),
    [selectedGoal.id, workspace.tasks],
  )
  const reviewMutation = useMutation({
    mutationFn: () => requestWeeklyReview(workspace, selectedGoal.id),
    onSuccess: (session) => {
      updateWorkspace(queryClient, (current) => ({
        ...current,
        aiSessions: [session, ...current.aiSessions],
      }))
      trackEvent({
        name: "weekly_review_completed",
        params: { goalId: selectedGoal.id },
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
    updateWorkspace(queryClient, (current) => toggleTask(current, taskId, done))
    trackEvent({ name: "task_toggled", params: { taskId, done } })
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <GraduationCapIcon />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">FocusTrack AI</span>
              <span className="text-muted-foreground truncate text-xs">
                OTUS project
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ label, icon: Icon }, index) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton isActive={index === 0}>
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
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <DatabaseIcon />
                    <span>
                      {workspace.mode === "supabase" ? "Supabase" : "Демо"}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <SparklesIcon />
                    <span>OpenRouter</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-2">
            <Badge variant="outline">ДЗ 3-6 + проект</Badge>
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
                  <h1 className="text-xl font-semibold tracking-normal">
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
                    <Badge variant="secondary">
                      <DatabaseIcon />
                      {workspace.mode === "supabase"
                        ? "Supabase подключен"
                        : "Демо-режим"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Фронт не хранит OpenRouter API key; AI работает через Edge
                    Functions.
                  </TooltipContent>
                </Tooltip>
                <AuthButtons />
                <CreateGoalDialog />
              </div>
            </div>
          </header>
          <ScrollArea className="flex-1">
            <main className="grid gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
              <section className="flex flex-col gap-4">
                <GoalList
                  goals={workspace.goals}
                  selectedGoalId={selectedGoal.id}
                  onSelectGoal={setSelectedGoalId}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Метрики</CardTitle>
                    <CardDescription>Для быстрой проверки MVP.</CardDescription>
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
                <GoalDetail
                  goal={selectedGoal}
                  tasks={selectedTasks}
                  onToggleTask={handleToggleTask}
                  onRequestReview={() => reviewMutation.mutate()}
                  isReviewPending={reviewMutation.isPending}
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <ProgressChart goals={workspace.goals} />
                  <KnowledgePanel workspace={workspace} />
                </div>
                <SessionsTable workspace={workspace} />
              </section>
              <aside className="flex flex-col gap-4">
                <AiReviewPanel workspace={workspace} goal={selectedGoal} />
                <Card>
                  <CardHeader>
                    <CardTitle>Готовность сдачи</CardTitle>
                    <CardDescription>
                      Отдельные папки артефактов.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {[
                      ["ДЗ 3", "Спецификация"],
                      ["ДЗ 4", "Frontend MVP"],
                      ["ДЗ 5", "Backend"],
                      ["ДЗ 6", "RAG + аудит"],
                      ["Проект", "MVP + презентация"],
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
                  <CardFooter>
                    <Select defaultValue="hw3">
                      <SelectTrigger>
                        <SelectValue placeholder="Артефакт" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="hw3">ДЗ 3</SelectItem>
                          <SelectItem value="hw4">ДЗ 4</SelectItem>
                          <SelectItem value="hw5">ДЗ 5</SelectItem>
                          <SelectItem value="hw6">ДЗ 6</SelectItem>
                          <SelectItem value="final">Проект</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </CardFooter>
                </Card>
              </aside>
            </main>
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
