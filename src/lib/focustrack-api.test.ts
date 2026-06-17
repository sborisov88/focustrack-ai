import { beforeEach, describe, expect, it, vi } from "vitest"

const supabaseMock = vi.hoisted(() => ({
  client: null as null | {
    auth: {
      getSession: () => Promise<{
        data: { session: { user: { id: string; email?: string } } | null }
        error: Error | null
      }>
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
          table === "weekly_reviews"
            ? { limit: () => response }
            : response,
      }),
    }),
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
  })
})
