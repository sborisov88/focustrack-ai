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
  createKnowledgeDocumentOnServer,
  createGoal,
  createLocalGoal,
  createStarterKnowledgeDocument,
  deleteGoal,
  generateTasksForGoal,
  loadWorkspace,
  requestGoalClarification,
  requestGoalPlan,
  requestRagAnswer,
  toggleTask,
  updateKnowledgeDocumentOnServer,
} from "@/lib/focustrack-api"
import type { Goal, KnowledgeDocument, Workspace } from "@/lib/domain"
import { splitKnowledgeContentIntoChunks } from "@/lib/knowledge-rag"

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

const multiDocuments: KnowledgeDocument[] = [
  {
    id: "d-first",
    title: "Первая заметка",
    source: "manual",
    content: "Сегодня я хорошо потренировался и сделал восстановительную работу.",
  },
  {
    id: "d-journal",
    title: "Журнал тренировок",
    source: "manual",
    content: "Неделя 8: длинная пробежка 15 км — пока самая длинная пробежка.",
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

type InsertedKnowledgeDocumentRow = {
  user_id: string
  title: string
  source: string
  content: string
  tags: string[]
  embedding_status?: "pending" | "indexing" | "ready" | "failed"
  embedding_error?: string | null
  embedded_at?: string | null
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

function createKnowledgeSupabaseClientMock() {
  const insertedDocuments: InsertedKnowledgeDocumentRow[] = []
  const updatedDocuments: Array<Partial<InsertedKnowledgeDocumentRow>> = []
  const insertedSessions: unknown[] = []
  const invoke = vi.fn(
    async <T,>(
      name: string,
      options: { body: unknown },
    ): Promise<{ data: T | null; error: Error | null }> => {
      const body = options.body as { selectedDocumentId?: string | null }
      const scope = body.selectedDocumentId == null ? "all" : "document"

      return {
        data:
          name === "rag-answer"
            ? ({
                type: "rag-answer",
                model: "test-chat",
                answer: "Ответ по найденному чанку.",
                citations: [{ title: "Дневник пробежек", similarity: 0.91 }],
                retrieval: {
                  matchCount: 1,
                  threshold: 0.55,
                  embeddingModel: "baai/bge-m3",
                  scope,
                },
              } as T)
            : ({ type: "embed-knowledge-document", status: "ready" } as T),
        error: null,
      }
    },
  )
  const from = vi.fn((table: string) => {
    if (table === "knowledge_documents") {
      return {
        insert: (row: InsertedKnowledgeDocumentRow) => {
          insertedDocuments.push(row)

          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "doc-starter",
                    title: row.title,
                    source: row.source,
                    content: row.content,
                    embedding_status: row.source === "manual" ? "pending" : "ready",
                    embedding_error: null,
                    embedded_at: null,
                    updated_at: "2026-06-25T00:00:00.000Z",
                    content_hash: null,
                  },
                  error: null,
                }),
            }),
          }
        },
        update: (row: Partial<InsertedKnowledgeDocumentRow>) => {
          updatedDocuments.push(row)

          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: "doc-edit",
                        title: row.title,
                        source: row.source,
                        content: row.content,
                        embedding_status: row.embedding_status ?? "pending",
                        embedding_error: null,
                        embedded_at: null,
                        updated_at: "2026-06-25T00:00:00.000Z",
                        content_hash: null,
                      },
                      error: null,
                    }),
                }),
              }),
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
    insertedDocuments,
    insertedSessions,
    updatedDocuments,
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

  it("в демо-режиме all-mode выбирает релевантный источник не по первому документу", async () => {
    const result = await requestRagAnswer({
      question: "на какой неделе самая длинная пробежка?",
      documents: multiDocuments,
      selectedDocumentId: null,
    })

    expect(result.model).toBe("demo")
    expect(result.answer).toContain("Журнал тренировок")
    expect(result.citations?.map((citation) => citation.documentId)).toContain(
      "d-journal",
    )
    expect(result.retrieval?.scope).toBe("all")
  })

  it("в Supabase-режиме отправляет selectedDocumentId null для всех источников", async () => {
    const knowledgeMock = createKnowledgeSupabaseClientMock()
    supabaseMock.client = knowledgeMock.client
    supabaseMock.hasConfig = true

    const result = await requestRagAnswer({
      question: "на какой неделе самая длинная пробежка?",
      documents: multiDocuments,
      selectedDocumentId: null,
    })

    expect(knowledgeMock.invoke).toHaveBeenCalledWith("rag-answer", {
      body: {
        question: "на какой неделе самая длинная пробежка?",
        selectedDocumentId: null,
      },
    })
    expect(result.retrieval?.scope).toBe("all")
    expect(knowledgeMock.insertedSessions).toHaveLength(1)
  })

  it("в Supabase-режиме отправляет selectedDocumentId для выбранного источника", async () => {
    const knowledgeMock = createKnowledgeSupabaseClientMock()
    supabaseMock.client = knowledgeMock.client
    supabaseMock.hasConfig = true

    const result = await requestRagAnswer({
      question: "на какой неделе самая длинная пробежка?",
      documents,
      selectedDocumentId: "d1",
    })

    expect(knowledgeMock.invoke).toHaveBeenCalledWith("rag-answer", {
      body: {
        question: "на какой неделе самая длинная пробежка?",
        selectedDocumentId: "d1",
      },
    })
    expect(result.retrieval?.embeddingModel).toBe("baai/bge-m3")
    expect(result.retrieval?.scope).toBe("document")
    expect(knowledgeMock.insertedSessions).toHaveLength(1)
  })
})

describe("requestRagAnswer (демо-ретрив — регрессии A1–A6)", () => {
  it("A1: на не-беговой вопрос отвечает из релевантной заметки, а не «недостаточно данных»", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "run",
        title: "Дневник пробежек",
        source: "demo",
        content: "Неделя 8: самая длинная пробежка 15 км.",
      },
      {
        id: "budget",
        title: "Бюджет",
        source: "demo",
        content: "Откладываю по 20000 рублей в месяц на марафон.",
      },
    ]
    const result = await requestRagAnswer({
      question: "сколько я откладываю в месяц?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.model).toBe("demo")
    expect(result.answer).toContain("Бюджет")
    expect(result.answer).toContain("20000")
    expect(result.answer).not.toContain("недостаточно данных")
  })

  it("A2: недельный объём не выдаётся за самую длинную пробежку", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "log",
        title: "План",
        source: "demo",
        content: "Недельный объём 40 км.\nСамая длинная пробежка 18 км.",
      },
    ]
    const result = await requestRagAnswer({
      question: "какая была самая длинная пробежка?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).toContain("18 км")
    expect(result.answer).not.toContain("40 км")
  })

  it("A3: без релевантных источников отвечает «недостаточно данных», не фабрикуя из всех заметок", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "run",
        title: "Дневник пробежек",
        source: "demo",
        content: "Неделя 8: пробежка 15 км.",
      },
    ]
    const result = await requestRagAnswer({
      question: "какая столица Франции?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).toContain("недостаточно данных")
    expect(result.citations).toHaveLength(0)
  })

  it("A4: цитирует только релевантные источники и не помечает их сходством 1.00", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "run",
        title: "Дневник пробежек",
        source: "demo",
        content: "Неделя 8: самая длинная пробежка 15 км.",
      },
      {
        id: "ielts",
        title: "IELTS",
        source: "demo",
        content: "Подготовка к экзамену по английскому языку.",
      },
    ]
    const result = await requestRagAnswer({
      question: "самая длинная пробежка?",
      documents: docs,
      selectedDocumentId: null,
    })

    const citedIds = result.citations?.map((citation) => citation.documentId)
    expect(citedIds).toContain("run")
    expect(citedIds).not.toContain("ielts")
    for (const citation of result.citations ?? []) {
      expect(citation.similarity).toBeLessThan(1)
    }
  })

  it("A5: сшивает русские словоформы там, где подстрочный includes() промахивался", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "fin",
        title: "Финансы",
        source: "demo",
        content: "Откладывать на цель помогают месячные лимиты.",
      },
      {
        id: "run",
        title: "Пробежки",
        source: "demo",
        content: "Неделя 8: пробежка 15 км.",
      },
    ]
    const result = await requestRagAnswer({
      question: "сколько откладываю каждый месяц?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).toContain("Финансы")
    expect(result.citations?.map((citation) => citation.documentId)).toContain(
      "fin",
    )
  })

  it("A6: отвечает по заметке с дистанцией прописью (старый парсер 10–20 ломался)", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "run",
        title: "Тренировки",
        source: "demo",
        content: "В субботу пробежка на тридцать километров прошла отлично.",
      },
    ]
    const result = await requestRagAnswer({
      question: "что было на тренировке в субботу?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).toContain("тридцать")
  })
})

describe("requestRagAnswer (демо-ретрив — регрессии адверсариального ревью)", () => {
  it("R1: межтематическое слово не матчится по короткому префиксу (проблема ≠ пробежка)", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "run",
        title: "Дневник пробежек",
        source: "demo",
        content: "Неделя 8: самая длинная пробежка 15 км.",
      },
    ]
    const result = await requestRagAnswer({
      question: "какие у меня проблемы со сном?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).toContain("недостаточно данных")
    expect(result.citations).toHaveLength(0)
  })

  it("R2: короткие числовые факты участвуют в demo-поиске", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "starter",
        title: "Стартовая заметка",
        source: "demo",
        content: "Нед. 8: длинная пробежка 15 км.",
      },
    ]
    const result = await requestRagAnswer({
      question: "на какой неделе было 15 км?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).toContain("Стартовая заметка")
    expect(result.answer).toContain("Нед. 8")
    expect(result.answer).toContain("15 км")
    expect(result.answer).not.toContain("недостаточно данных")
    expect(result.citations?.map((citation) => citation.documentId)).toContain(
      "starter",
    )
  })

  it("R3: полное короткое слово не считается словоформой более длинного слова-префикса", async () => {
    const cases: Array<{
      question: string
      document: KnowledgeDocument
      forbiddenAnswer: string
    }> = [
      {
        question: "какой день был продуктивным?",
        document: {
          id: "money",
          title: "Финансы",
          source: "demo",
          content: "Деньги на марафон отложены в резерв.",
        },
        forbiddenAnswer: "Деньги",
      },
      {
        question: "какой план на вечер?",
        document: {
          id: "core",
          title: "Тренировки",
          source: "demo",
          content: "Планка по утрам укрепляет корпус.",
        },
        forbiddenAnswer: "Планка",
      },
    ]

    for (const testCase of cases) {
      const result = await requestRagAnswer({
        question: testCase.question,
        documents: [testCase.document],
        selectedDocumentId: null,
      })

      expect(result.answer).toContain("недостаточно данных")
      expect(result.answer).not.toContain(testCase.forbiddenAnswer)
      expect(result.citations).toHaveLength(0)
    }
  })

  it("R4: выбранный вручную источник без пересечения с вопросом → «недостаточно данных», не первое предложение", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "run",
        title: "Дневник пробежек",
        source: "demo",
        content: "Неделя 8: самая длинная пробежка 15 км.",
      },
    ]
    const result = await requestRagAnswer({
      question: "какая столица Франции?",
      documents: docs,
      selectedDocumentId: "run",
    })

    expect(result.answer).toContain("недостаточно данных")
    expect(result.citations).toHaveLength(0)
  })

  it("R5: совпадение только по заголовку не выдаёт нерелевантное предложение контента", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "b",
        title: "Бюджет на марафон",
        source: "demo",
        content: "Сегодня пробежал десять км отлично.",
      },
    ]
    const result = await requestRagAnswer({
      question: "какой у меня бюджет?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).not.toContain("пробежал")
    expect(result.answer).toContain("недостаточно данных")
  })

  it("R6: неизвестный selectedDocumentId трактуется как «все источники», а не молча первый документ", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "a",
        title: "Заметка о сне",
        source: "demo",
        content: "Сон по 8 часов улучшает восстановление.",
      },
      {
        id: "b",
        title: "Бюджет",
        source: "demo",
        content: "Откладываю 20000 рублей в месяц.",
      },
    ]
    const result = await requestRagAnswer({
      question: "сколько откладываю в месяц?",
      documents: docs,
      selectedDocumentId: "DELETED",
    })

    expect(result.retrieval?.scope).toBe("all")
    expect(result.answer).toContain("Бюджет")
  })

  it("R7: коллизия 4-символьного префикса не фабрикует цитируемый ответ (горох ≠ город, корова ≠ король)", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "city",
        title: "Город",
        source: "demo",
        content: "В городе живёт много людей. Король правил мудро.",
      },
    ]
    const result = await requestRagAnswer({
      question: "где паслась корова на лугу?",
      documents: docs,
      selectedDocumentId: null,
    })

    expect(result.answer).toContain("недостаточно данных")
    expect(result.answer).not.toContain("Король")
    expect(result.citations).toHaveLength(0)
  })

  it("R8: сходство в цитатах согласовано с порядком списка (по найденным словам, не по доле в документе)", async () => {
    const docs: KnowledgeDocument[] = [
      {
        id: "run",
        title: "Дневник пробежек",
        source: "demo",
        content: "Неделя 8: самая длинная пробежка 15 км.",
      },
    ]
    const result = await requestRagAnswer({
      question: "какая была самая длинная пробежка?",
      documents: docs,
      selectedDocumentId: null,
    })

    const similarities = (result.citations ?? []).map(
      (citation) => citation.similarity ?? 0,
    )
    // Список отсортирован по убыванию — отображаемое сходство не должно расти.
    for (let index = 1; index < similarities.length; index += 1) {
      expect(similarities[index]).toBeLessThanOrEqual(similarities[index - 1])
    }
    for (const similarity of similarities) {
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThan(1)
    }
  })
})

describe("knowledge sources", () => {
  it("createStarterKnowledgeDocument создаёт стартовый источник в public.knowledge_documents", async () => {
    const knowledgeMock = createKnowledgeSupabaseClientMock()
    supabaseMock.client = knowledgeMock.client
    supabaseMock.hasConfig = true

    const document = await createStarterKnowledgeDocument()

    expect(document).toMatchObject({
      id: "doc-starter",
      title: "Журнал тренировок (стартовый источник)",
      source: "starter",
      content: expect.stringContaining("Нед. 8: длинная 15 км"),
    })
    expect(knowledgeMock.invoke).toHaveBeenCalledWith(
      "embed-knowledge-document",
      { body: { documentId: "doc-starter" } },
    )
    expect(knowledgeMock.insertedDocuments).toEqual([
      {
        user_id: "user-1",
        title: "Журнал тренировок (стартовый источник)",
        source: "starter",
        content: expect.stringContaining("самая длинная пробежка"),
        tags: ["бег", "тренировки", "стартовый источник"],
      },
    ])
  })

  it("createKnowledgeDocumentOnServer сохраняет ручную заметку и запускает индексацию", async () => {
    const knowledgeMock = createKnowledgeSupabaseClientMock()
    supabaseMock.client = knowledgeMock.client
    supabaseMock.hasConfig = true

    await createKnowledgeDocumentOnServer({
      title: "  Контрольный дневник  ",
      content:
        "Неделя 12: контрольная пробежка 18 км. Пульс в целевой зоне, самочувствие стабильное.",
    })

    expect(knowledgeMock.insertedDocuments[0]).toMatchObject({
      user_id: "user-1",
      title: "Контрольный дневник",
      source: "manual",
      content: expect.stringContaining("контрольная пробежка 18 км"),
      embedding_status: "pending",
    })
    expect(knowledgeMock.invoke).toHaveBeenCalledWith(
      "embed-knowledge-document",
      { body: { documentId: "doc-starter" } },
    )
  })

  it("updateKnowledgeDocumentOnServer сбрасывает статус и переиндексирует заметку", async () => {
    const knowledgeMock = createKnowledgeSupabaseClientMock()
    supabaseMock.client = knowledgeMock.client
    supabaseMock.hasConfig = true

    await updateKnowledgeDocumentOnServer("doc-edit", {
      title: "Обновлённый дневник",
      content:
        "Неделя 13: длинная пробежка 19 км заменила старый факт о дистанции.",
    })

    expect(knowledgeMock.updatedDocuments[0]).toMatchObject({
      title: "Обновлённый дневник",
      source: "manual",
      content: expect.stringContaining("19 км"),
      embedding_status: "pending",
    })
    expect(knowledgeMock.invoke).toHaveBeenCalledWith(
      "embed-knowledge-document",
      { body: { documentId: "doc-edit" } },
    )
  })
})

describe("splitKnowledgeContentIntoChunks", () => {
  it("сохраняет порядок абзацев и добавляет overlap между чанками", () => {
    const chunks = splitKnowledgeContentIntoChunks(
      [
        "Первый абзац про лёгкую пробежку 8 км.",
        "Второй абзац фиксирует длинную пробежку 16 км.",
        "Третий абзац описывает восстановление и сон.",
      ].join("\n\n"),
      { maxChunkChars: 75, overlapChars: 18 },
    )

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(
      chunks.map((_, index) => index),
    )
    expect(chunks[0].content).toContain("Первый абзац")
    expect(chunks[1].content).toContain("Второй абзац")
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
