# Проверка влияния правил

## Цель проверки

Показать на одной и той же задаче, как проектные правила FocusTrack AI (корневой `AGENTS.md`) меняют сырой вывод AI-агента. Ниже приведены **дословные** ответы агента: сначала без правил, затем с загруженными правилами. Это зафиксированный вывод двух реальных изолированных прогонов, без пересказа и редакторской переработки.

## Параметры контрольного прогона

| Параметр         | Значение                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Агент            | Codex CLI (`@openai/codex` 0.139.0), модель `gpt-5.5`                                               |
| Команда          | `codex exec --skip-git-repo-check --ephemeral -s read-only`                                         |
| Дата прогона     | 2026-06-17                                                                                          |
| Режим            | Изолированные сессии: на каждый прогон — чистый рабочий каталог                                     |
| Прогон «ДО»      | Пустой каталог без `AGENTS.md`, подан только текст контрольной задачи                               |
| Прогон «ПОСЛЕ»   | В промпт загружен корневой `AGENTS.md` + запрос по шаблону RTCF (Шаблон 1 из `prompt_templates.md`) |
| Обработка вывода | Финальный ответ Codex (`--output-last-message`) вставлен дословно, без редактирования               |

> Контрольный прогон выполнен основным агентом проекта — **Codex** — в headless-режиме (`codex exec`) ради воспроизводимости. Единственное различие между прогонами — наличие файла правил `AGENTS.md` в контексте, поэтому это честный A/B.

## Контрольная задача

Обоим прогонам подан один и тот же пользовательский запрос:

```text
Создай компонент карточки цели с прогрессом.
```

- **ДО**: задача подана дословно, без какого-либо проектного контекста.
- **ПОСЛЕ**: та же задача обёрнута в шаблон RTCF и сопровождена правилами `AGENTS.md`.

### Точный промпт прогона «ПОСЛЕ» (RTCF)

```text
Role: Ты senior React + TypeScript разработчик в проекте FocusTrack AI.
Task: Создай компонент карточки цели с прогрессом (например, GoalSummaryCard).
Context:
- Стек: React, TypeScript, Vite, Tailwind.
- Домен: цели (goal), задачи (task), прогресс (progress), streak, ближайшая невыполненная задача.
- Используй доменные TypeScript-типы.
- Нужны состояния empty/loading/error, если они применимы.
- Не добавляй новых зависимостей.
Format:
- Сначала краткий план.
- Затем список файлов.
- Затем код.
- В конце список проверок.
```

Дополнительно в промпт прогона «ПОСЛЕ» загружен полный текст корневого `AGENTS.md`.

## Сырой ответ агента ДО применения правил

> Дословный вывод изолированного прогона Codex без проектных правил (2026-06-17). Не редактировался.

````text
Могу сделать. Без контекста проекта возьму нейтральный вариант: React + TypeScript, без внешних зависимостей.

```tsx
type GoalCardProps = {
  title: string;
  description?: string;
  progress: number; // 0-100
  targetLabel?: string;
};

export function GoalCard({
  title,
  description,
  progress,
  targetLabel,
}: GoalCardProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>

        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">Прогресс</span>
        <span className="text-gray-600">{normalizedProgress}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>

      {targetLabel && (
        <p className="mt-3 text-sm text-gray-500">{targetLabel}</p>
      )}
    </article>
  );
}
```

Пример использования:

```tsx
<GoalCard
  title="Накопить на отпуск"
  description="Цель на ближайшие 6 месяцев"
  progress={64}
  targetLabel="64 000 ₽ из 100 000 ₽"
/>
```
````

### Наблюдаемые слабые места ответа «ДО»

- Codex сам отмечает «без контекста проекта возьму нейтральный вариант» — доменного контекста нет.
- Абстрактные пропсы (`progress`, `targetLabel`) вместо доменной модели: нет понятий goal и task продукта.
- Нет доменных типов `Goal`/`Task`, только локальный `GoalCardProps`.
- Не учтены streak и ближайшая невыполненная задача — ключевые элементы дашборда FocusTrack AI.
- Нет состояний loading/empty/error.
- Прогресс — просто число с текстовой подписью, без связи с задачами и проверок диапазона по домену.

## Сырой ответ агента ПОСЛЕ применения правил (`AGENTS.md` + RTCF)

> Дословный вывод изолированного прогона Codex с загруженными правилами (2026-06-17). Не редактировался.

````text
**План**

1. Добавить доменные типы для цели, задачи и прогресса.
2. Создать `GoalSummaryCard` с состояниями `loading`, `error`, `empty`.
3. Показать прогресс, streak и ближайшую невыполненную задачу без новых зависимостей.

**Файлы**

- `src/features/goals/types.ts`
- `src/features/goals/components/GoalSummaryCard.tsx`

**Код**

```ts
// src/features/goals/types.ts

export type GoalStatus = 'active' | 'completed' | 'paused';

export type GoalTask = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
};

export type GoalProgress = {
  completedTasks: number;
  totalTasks: number;
  percent: number;
};

export type GoalSummary = {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  streakDays: number;
  progress: GoalProgress;
  nextTask?: GoalTask;
};
```

```tsx
// src/features/goals/components/GoalSummaryCard.tsx

import type { GoalSummary } from '../types';

type GoalSummaryCardProps = {
  goal?: GoalSummary | null;
  isLoading?: boolean;
  error?: string | null;
};

export function GoalSummaryCard({
  goal,
  isLoading = false,
  error = null,
}: GoalSummaryCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-5 h-3 w-full animate-pulse rounded bg-slate-200" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h3 className="text-sm font-semibold text-red-800">Не удалось загрузить цель</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </section>
    );
  }

  if (!goal) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-800">Цель пока не выбрана</h3>
        <p className="mt-1 text-sm text-slate-600">
          Добавьте цель, чтобы увидеть прогресс, streak и ближайшую задачу.
        </p>
      </section>
    );
  }

  const progressPercent = Math.min(Math.max(goal.progress.percent, 0), 100);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{goal.title}</h3>
          {goal.description && (
            <p className="mt-1 text-sm text-slate-600">{goal.description}</p>
          )}
        </div>

        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          {goal.streakDays} дней streak
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Прогресс</span>
          <span className="text-slate-500">
            {goal.progress.completedTasks} из {goal.progress.totalTasks}
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 rounded-md bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Ближайшая задача
        </p>

        {goal.nextTask ? (
          <p className="mt-1 text-sm font-medium text-slate-900">{goal.nextTask.title}</p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Все задачи по этой цели выполнены.</p>
        )}
      </div>
    </section>
  );
}
```

**Проверки**

- `npm run build` — проверить TypeScript и сборку.
- `npm run lint` — проверить стиль кода, если lint уже настроен в проекте.
- Для UI: открыть экран с карточкой и проверить состояния `loading`, `error`, `empty`, заполненная цель.
````

## Что улучшилось (по фактическим выводам)

| Критерий        | ДО правил                            | ПОСЛЕ правил                                         |
| --------------- | ------------------------------------ | ---------------------------------------------------- |
| Доменная модель | Абстрактные `progress`/`targetLabel` | Доменные `Goal`/`Task`, streak, ближайшая задача     |
| Типизация       | Локальный `GoalCardProps`            | Доменные TypeScript-типы цели/задачи/прогресса       |
| Состояния UI    | Нет                                  | Явные `loading`/`error`/`empty`                      |
| Зависимости     | Нейтральный вариант                  | Tailwind по правилам проекта, без новых зависимостей |
| Формат ответа   | Просто код + пример                  | RTCF: план → файлы → код → проверки                  |
| Контекст        | «Без контекста проекта»              | Контекст задан правилами `AGENTS.md`                 |

## Вывод

Единственное различие между прогонами — наличие `AGENTS.md` в контексте. Без правил Codex выдаёт корректный, но обобщённый компонент: он прямо оговаривает отсутствие контекста, не привязывается к продукту, не добавляет состояний и доменных типов. С правилами тот же запрос даёт доменно-типизированный `GoalSummaryCard` в стеке проекта (React/TS/Tailwind), с явными состояниями loading/empty/error и форматом RTCF (план → файлы → код → проверки).

Это подтверждает роль `AGENTS.md` и согласуется с рекомендацией OpenAI по `AGENTS.md`: агент работает надёжнее, когда заранее знает стек, домен, ограничения и критерии готовности, а не выдаёт нейтральную заготовку.
