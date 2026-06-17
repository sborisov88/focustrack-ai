import { describe, expect, it, vi } from "vitest"

// Без Supabase-сессии API-слой обязан корректно деградировать в демо-режим и
// валидировать вход. Мокаем клиента в null, чтобы детерминированно проверить
// именно эти ветки (валидация + graceful fallback), без сети.
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => null,
  hasSupabaseConfig: () => false,
}))

import {
  createGoal,
  createLocalGoal,
  requestGoalClarification,
  requestGoalPlan,
  requestRagAnswer,
  toggleTask,
} from "@/lib/focustrack-api"
import type { Goal, KnowledgeDocument, Workspace } from "@/lib/domain"

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
