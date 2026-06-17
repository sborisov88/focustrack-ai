# Проверка влияния правил

## Цель проверки

Показать, как проектные правила для Codex улучшают результат на одной и той же задаче.

## Контрольная задача

```text
Создай компонент карточки цели с прогрессом.
```

## Ответ до применения правил

> Примечание: приведённый ниже ответ иллюстративный и репрезентативный — это сокращённая реконструкция типичного результата без проектных правил, а не дословный сырой вывод агента. Он показывает характерные слабые места, а не точную посимвольную выдачу конкретного запуска.

```text
Создам React-компонент GoalCard, который принимает title и progress.

type GoalCardProps = {
  title: string;
  progress: number;
};

export function GoalCard({ title, progress }: GoalCardProps) {
  return (
    <div className="rounded-xl border p-4 shadow">
      <h3>{title}</h3>
      <div className="mt-2 h-2 rounded bg-gray-200">
        <div
          className="h-2 rounded bg-blue-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p>{progress}% complete</p>
    </div>
  );
}
```

### Проблемы ответа

- Нет связи с доменом FocusTrack AI.
- Нет типов `Goal` и `Task`.
- Нет empty/error/loading states.
- Не учитывается streak и ближайшая задача.
- Не указаны проверки.
- Текст интерфейса на английском без причины.

## Ответ после применения `AGENTS.md`

> Примечание: приведённый ниже ответ также иллюстративный и репрезентативный — это причёсанная реконструкция типичного результата с подключёнными проектными правилами, а не дословный сырой вывод агента. Он демонстрирует, какие улучшения дают правила, а не точную посимвольную выдачу конкретного запуска.

```text
План:
1. Использовать доменные типы Goal и Task.
2. Сделать карточку цели с процентом выполнения, streak и ближайшей задачей.
3. Добавить empty state для цели без задач.
4. Сохранить компонент без новых зависимостей.

Файл: src/components/GoalSummaryCard.tsx

type TaskStatus = "todo" | "in_progress" | "done";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string;
};

type Goal = {
  id: string;
  title: string;
  progress: number;
  streak: number;
  tasks: Task[];
};

type GoalSummaryCardProps = {
  goal: Goal;
};

export function GoalSummaryCard({ goal }: GoalSummaryCardProps) {
  const nextTask = goal.tasks.find((task) => task.status !== "done");
  const safeProgress = Math.max(0, Math.min(100, goal.progress));

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{goal.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Серия: {goal.streak} дн.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-700">
          {safeProgress}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100">
        <div
          className="h-full rounded bg-emerald-500"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-700">
        {nextTask ? `Следующая задача: ${nextTask.title}` : "Все задачи по цели выполнены."}
      </p>
    </article>
  );
}

Проверки:
- добавить unit-тест на safeProgress;
- проверить empty state для цели без задач;
- проверить отображение ближайшей невыполненной задачи.
```

## Что улучшилось

| Критерий | До правил | После правил |
|----------|-----------|--------------|
| Контекст продукта | Общая карточка | FocusTrack AI: цель, задачи, streak |
| Типизация | Только props | Доменные типы Goal/Task |
| Состояния | Не учтены | Есть empty state |
| Язык интерфейса | Английский | Русский |
| Проверки | Нет | Указаны тесты |
| Ограничения | Не видны | Нет новых зависимостей, прогресс ограничен 0..100 |

## Вывод

Правила в `AGENTS.md` делают ответ ближе к реальному проекту: Codex учитывает стек, домен, стиль интерфейса, проверки и ограничения безопасности. Это соответствует рекомендации OpenAI: Codex работает надёжнее, когда знает, что считается хорошим результатом, и когда инструкции задают проверки, review и критерии готовности.
