import { beforeEach, describe, expect, it, vi } from "vitest"

const supabaseMock = vi.hoisted(() => ({
  client: null as null | {
    auth: {
      getSession: () => Promise<{
        data: { session: { user: { id: string; email?: string } } | null }
        error: Error | null
      }>
    }
    functions?: {
      invoke: (
        name: string,
        options: { body: unknown },
      ) => Promise<{ data: unknown; error: Error | null }>
    }
    from: (table: string) => unknown
  },
  hasConfig: false,
}))

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => supabaseMock.client,
  hasSupabaseConfig: () => supabaseMock.hasConfig,
}))

import {
  createGoal,
  createLocalGoal,
  deleteGoal,
  generateTasksForGoal,
  loadWorkspace,
  requestGoalClarification,
  requestGoalPlan,
  requestRagAnswer,
  toggleTask,
} from "@/lib/focustrack-api"
import type { Goal, KnowledgeDocument, Workspace } from "@/lib/domain"

beforeEach(() => {
  supabaseMock.client = null
  supabaseMock.hasConfig = false
})

const goal: Goal = {
  id: "g1",
  title: "Пробежать полумарафон",
  description: "",
  status: "active",
  targetDate: "2026-09-01",
  progressPercent: 0,
  clarifiedContext: {},
}

const documents: KnowledgeDocument[] = [
  {
    id: "d1",
    title: "Дневник пробежек",
    source: "demo",
    content: "Неделя 8: самая длинная пробежка 15 км.",
  },
]

const baseWorkspace: Workspace = {
  mode: "demo",
  goals: [goal],
  tasks: [
    {
      id: "t1",
      goalId: "g1",
      title: "Базовый объём",
      notes: "",
      effort: "S",
      dueDate: "",
      status: "todo",
      sortOrder: 1,
    },
    {
      id: "t2",
      goalId: "g1",
      title: "Длинная пробежка",
      notes: "",
      effort: "M",
      dueDate: "",
      status: "todo",
      sortOrder: 2,
    },
  ],
  aiSessions: [],
  weeklyReview: { weekStart: "", summary: "", recommendations: [], risks: [] },
  knowledgeDocuments: documents,
}

function createEmptySupabaseClientMock() {
  const response = Promise.resolve({ data: [], error: null })

  return {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: { user: { id: "user-1", email: "demo@focustrack.ai" } },
          },
          error: null,
        }),
    },
    from: (table: string) => ({
      select: () => ({
        order: () =>
          table === "weekly_reviews" ? { limit: () => response } : response,
      }),
    }),
  }
}

type InsertedTaskRow = {
  user_id: string
  goal_id: string
  title: string
  notes: string
  effort: "S" | "M" | "L"
  due_date: string | null
  status: "todo"
  sort_order: number
}

function createPlanningSupabaseClientMock() {
  const insertedTaskRows: InsertedTaskRow[] = []
  const insertedSessions: unknown[] = []
  const invoke = vi.fn(
    async <T,>(
      name: string,
      options: { body: unknown },
    ): Promise<{ data: T | null; error: Error | null }> => ({
      data: {
        type: "plan",
        model: "test-model",
        plan: `План для ${JSON.stringify(options.body)}`,
        tasks: [
          {
            title: "Проверить текущий уровень",
            notes: "Зафиксировать стартовые метрики.",
            effort: "S",
            dueDate: "2026-07-01",
          },
          {
            title: "Сделать недельный спринт",
            notes: "Выполнить первый набор действий.",
            effort: "M",
            dueDate: "",
          },
        ],
      } as T,
      error: name === "ai-plan" ? null : new Error("unexpected function"),
    }),
  )
  const from = vi.fn((table: string) => {
    if (table === "tasks") {
      return {
        insert: (rows: InsertedTaskRow[]) => {
          insertedTaskRows.push(...rows)

          return {
            select: () =>
              Promise.resolve({
                data: rows.map((row, index) => ({
                  id: `task-${index + 1}`,
                  goal_id: row.goal_id,
                  title: row.title,
                  notes: row.notes,
                  effort: row.effort,
                  due_date: row.due_date,
                  status: row.status,
                  sort_order: row.sort_order,
                })),
                error: null,
              }),
          }
        },
      }
    }

    if (table === "ai_sessions") {
      return {
        insert: (row: unknown) => {
          insertedSessions.push(row)

          return Promise.resolve({ error: null })
        },
      }
    }

    return {
      select: () => Promise.resolve({ data: [], error: null }),
    }
  })

  return {
    client: {
      auth: {
        getSession: () =>
          Promise.resolve({
            data: {
              session: {
                user: { id: "user-1", email: "demo@focustrack.ai" },
              },
            },
            error: null,
          }),
      },
      functions: { invoke },
      from,
    },
    insertedSessions,
    insertedTaskRows,
    invoke,
  }
}

describe("loadWorkspace", () => {
  it("без Supabase-сессии возвращает anonymous workspace", async () => {
    const workspace = await loadWorkspace()

    expect(workspace.mode).toBe("anonymous")
    expect(workspace.goals).toHaveLength(0)
    expect(workspace.tasks).toHaveLength(0)
  })

  it("возвращает demo workspace только по явному signedOutMode", async () => {
    const workspace = await loadWorkspace({ signedOutMode: "demo" })

    expect(workspace.mode).toBe("demo")
    expect(workspace.goals.length).toBeGreaterThan(0)
  })

  it("для авторизованного пользователя с пустой БД возвращает пустой Supabase workspace", async () => {
    supabaseMock.client = createEmptySupabaseClientMock()
    supabaseMock.hasConfig = true

    const workspace = await loadWorkspace()

    expect(workspace.mode).toBe("supabase")
    expect(workspace.goals).toEqual([])
    expect(workspace.tasks).toEqual([])
    expect(workspace.aiSessions).toEqual([])
    expect(workspace.knowledgeDocuments).toEqual([])
  })
})

describe("createLocalGoal", () => {
  it("обрезает пробелы и проставляет дефолты черновика", () => {
    const created = createLocalGoal({
      title: "  Сдать IELTS  ",
      description: "  цель 7.0  ",
      targetDate: "2026-12-01",
    })

    expect(created.title).toBe("Сдать IELTS")
    expect(created.description).toBe("цель 7.0")
    expect(created.status).toBe("draft")
    expect(created.progressPercent).toBe(0)
  })
})

describe("createGoal", () => {
  it("добавляет новую цель в начало списка", () => {
    const next = createGoal(baseWorkspace, {
      title: "Новая цель",
      description: "",
      targetDate: "",
    })

    expect(next.goals).toHaveLength(2)
    expect(next.goals[0].title).toBe("Новая цель")
    expect(baseWorkspace.goals).toHaveLength(1) // исходный workspace не мутирован
  })
})

describe("deleteGoal", () => {
  it("удаляет цель, её задачи и связанные AI-сессии", () => {
    const next = deleteGoal(
      {
        ...baseWorkspace,
        aiSessions: [
          {
            id: "s1",
            goalId: "g1",
            type: "plan",
            model: "demo",
            status: "completed",
            summary: "План",
            createdAt: "2026-06-17T00:00:00.000Z",
          },
        ],
      },
      "g1",
    )

    expect(next.goals).toEqual([])
    expect(next.tasks).toEqual([])
    expect(next.aiSessions).toEqual([])
    expect(baseWorkspace.goals).toHaveLength(1)
  })

  it("удаляет только целевую цель, не трогая данные других целей", () => {
    const workspaceWithTwoGoals: Workspace = {
      ...baseWorkspace,
      goals: [
        goal,
        {
          id: "g2",
          title: "Сдать IELTS на 7.0",
          description: "",
          status: "active",
          targetDate: "2026-10-01",
          progressPercent: 0,
          clarifiedContext: {},
        },
      ],
      tasks: [
        ...baseWorkspace.tasks,
        {
          id: "t3",
          goalId: "g2",
          title: "Speaking practice",
          notes: "",
          effort: "M",
          dueDate: "",
          status: "todo",
          sortOrder: 1,
        },
      ],
      aiSessions: [
        {
          id: "s1",
          goalId: "g1",
          type: "plan",
          model: "demo",
          status: "completed",
          summary: "План g1",
          createdAt: "2026-06-17T00:00:00.000Z",
        },
        {
          id: "s2",
          goalId: "g2",
          type: "plan",
          model: "demo",
          status: "completed",
          summary: "План g2",
          createdAt: "2026-06-17T00:00:00.000Z",
        },
      ],
    }

    const next = deleteGoal(workspaceWithTwoGoals, "g1")

    // Цель g2 и всё связанное с ней должны пережить удаление g1 —
    // это отличает фильтрацию по goalId от полной очистки.
    expect(next.goals.map((item) => item.id)).toEqual(["g2"])
    expect(next.tasks.map((task) => task.id)).toEqual(["t3"])
    expect(next.aiSessions.map((session) => session.id)).toEqual(["s2"])
  })
})

describe("toggleTask", () => {
  it("пересчитывает прогресс цели при отметке задачи выполненной", () => {
    const next = toggleTask(baseWorkspace, "t1", true)

    expect(next.tasks.find((task) => task.id === "t1")?.status).toBe("done")
    expect(next.goals[0].progressPercent).toBe(50) // 1 из 2 задач выполнена
  })

  it("не меняет прогресс для несуществующей задачи", () => {
    const next = toggleTask(baseWorkspace, "missing", true)

    expect(next.goals[0].progressPercent).toBe(0)
    expect(next.tasks).toHaveLength(2)
  })
})

describe("requestRagAnswer (обработка ошибок)", () => {
  it("бросает ошибку на слишком короткий вопрос", async () => {
    await expect(
      requestRagAnswer({ question: "км?", documents }),
    ).rejects.toThrow("Введите вопрос по заметкам.")
  })

  it("бросает ошибку при отсутствии документов", async () => {
    await expect(
      requestRagAnswer({
        question: "на какой неделе самая длинная пробежка?",
        documents: [],
      }),
    ).rejects.toThrow("Нет документов для RAG-ответа.")
  })

  it("в демо-режиме возвращает ответ со ссылкой на источник", async () => {
    const result = await requestRagAnswer({
      question: "на какой неделе самая длинная пробежка?",
      documents,
    })

    expect(result.model).toBe("demo")
    expect(result.answer).toContain("Дневник пробежек")
  })
})

describe("AI-флоу в демо-режиме (graceful fallback)", () => {
  it("requestGoalClarification отдаёт демо-вопросы без бэкенда", async () => {
    const result = await requestGoalClarification({
      title: "Цель",
      description: "",
      targetDate: "",
    })

    expect(result.model).toBe("demo")
    expect(result.questions.length).toBeGreaterThanOrEqual(5)
  })

  it("requestGoalPlan отдаёт демо-план с учётом ответов", async () => {
    const result = await requestGoalPlan({
      goal,
      answers: { "Сколько времени в неделю": "5 часов" },
    })

    expect(result.model).toBe("demo")
    expect(result.plan).toContain(goal.title)
    expect(result.tasks).toHaveLength(3)
    expect(result.tasks[0].effort).toBe("S")
  })

  it("generateTasksForGoal в демо-режиме возвращает задачи для пустой цели", async () => {
    const result = await generateTasksForGoal(
      { ...baseWorkspace, tasks: [] },
      "g1",
    )

    expect(result.result.model).toBe("demo")
    expect(result.tasks).toHaveLength(3)
    expect(result.tasks[0]).toMatchObject({
      goalId: "g1",
      status: "todo",
      sortOrder: 1,
    })
  })

  it("generateTasksForGoal не создаёт дубли для цели с задачами", async () => {
    await expect(generateTasksForGoal(baseWorkspace, "g1")).rejects.toThrow(
      "У этой цели уже есть задачи.",
    )
  })
})

describe("AI-планирование в Supabase", () => {
  it("requestGoalPlan сохраняет структурированные задачи в public.tasks", async () => {
    const planningMock = createPlanningSupabaseClientMock()
    supabaseMock.client = planningMock.client
    supabaseMock.hasConfig = true

    const result = await requestGoalPlan({
      goal,
      answers: { "Сколько времени в неделю": "5 часов" },
    })

    expect(planningMock.invoke).toHaveBeenCalledWith("ai-plan", {
      body: {
        goalTitle: goal.title,
        targetDate: goal.targetDate,
        answers: { "Сколько времени в неделю": "5 часов" },
      },
    })
    expect(result.tasks).toHaveLength(2)
    expect(planningMock.insertedTaskRows).toEqual([
      {
        user_id: "user-1",
        goal_id: "g1",
        title: "Проверить текущий уровень",
        notes: "Зафиксировать стартовые метрики.",
        effort: "S",
        due_date: "2026-07-01",
        status: "todo",
        sort_order: 1,
      },
      {
        user_id: "user-1",
        goal_id: "g1",
        title: "Сделать недельный спринт",
        notes: "Выполнить первый набор действий.",
        effort: "M",
        due_date: null,
        status: "todo",
        sort_order: 2,
      },
    ])
    expect(planningMock.insertedSessions).toHaveLength(1)
  })

  it("generateTasksForGoal сохраняет задачи для уже существующей пустой цели", async () => {
    const planningMock = createPlanningSupabaseClientMock()
    supabaseMock.client = planningMock.client
    supabaseMock.hasConfig = true

    const result = await generateTasksForGoal(
      { ...baseWorkspace, mode: "supabase", tasks: [] },
      "g1",
    )

    expect(result.tasks.map((task) => task.title)).toEqual([
      "Проверить текущий уровень",
      "Сделать недельный спринт",
    ])
    expect(planningMock.insertedTaskRows).toHaveLength(2)
    expect(planningMock.insertedSessions).toHaveLength(1)
  })
})
