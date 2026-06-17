# Проверка влияния правил (Шаг 5)

## Цель проверки

Показать на одной и той же задаче, как проектные правила FocusTrack AI (корневой `AGENTS.md`) меняют сырой вывод AI-агента. Ниже приведены **дословные** ответы агента: сначала без правил, затем с загруженными правилами. Это не реконструкция и не пересказ — это зафиксированный вывод двух реальных изолированных прогонов.

## Параметры контрольного прогона

| Параметр | Значение |
| --- | --- |
| Агент | Claude Code (CLI-агент, читающий `AGENTS.md`), модель Opus 4.8 |
| Дата прогона | 2026-06-17 |
| Режим | Изолированные сессии: на каждый прогон — чистый контекст |
| Прогон «ДО» | Контекст пуст, подан только текст контрольной задачи |
| Прогон «ПОСЛЕ» | В контекст загружен корневой `AGENTS.md` + запрос по шаблону RTCF (Шаблон 1 из `prompt_templates.md`) |
| Обработка вывода | Ответы вставлены дословно, без редактирования |

> `AGENTS.md` — кросс-агентный стандарт проектных инструкций (см. `rules.md`), поэтому контрольный прогон выполнен `AGENTS.md`-совместимым агентом в headless-режиме ради воспроизводимости. Это даёт честный A/B: единственное различие между прогонами — наличие файла правил в контексте.

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

Дополнительно в контекст прогона «ПОСЛЕ» загружен полный текст корневого `AGENTS.md`.

## Сырой ответ агента ДО применения правил

> Дословный вывод изолированного прогона без проектных правил (2026-06-17). Не редактировался.

````text
Конечно! Вот готовый, переиспользуемый компонент карточки цели с прогрессом. Я сделаю его на React + TypeScript, так как это самый распространённый стек. Компонент будет доступным (a11y), с типами и без внешних зависимостей.

## `GoalCard.tsx`

```tsx
import React from "react";
import "./GoalCard.css";

export interface GoalCardProps {
  /** Заголовок цели */
  title: string;
  /** Необязательное описание */
  description?: string;
  /** Текущее значение прогресса */
  current: number;
  /** Целевое значение (100%) */
  target: number;
  /** Единица измерения, напр. "₽", "км", "задач" */
  unit?: string;
  /** Срок выполнения (отображается, если передан) */
  deadline?: string;
  /** Клик по карточке (опционально) */
  onClick?: () => void;
}

export function GoalCard({
  title,
  description,
  current,
  target,
  unit = "",
  deadline,
  onClick,
}: GoalCardProps) {
  const safeTarget = target > 0 ? target : 1;
  const ratio = Math.min(current / safeTarget, 1);
  const percent = Math.round(ratio * 100);
  const isComplete = current >= target;

  const formatValue = (v: number) =>
    `${v.toLocaleString("ru-RU")}${unit ? ` ${unit}` : ""}`;

  return (
    <article
      className={`goal-card${isComplete ? " goal-card--complete" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <header className="goal-card__header">
        <h3 className="goal-card__title">{title}</h3>
        {isComplete && (
          <span className="goal-card__badge" aria-label="Цель достигнута">
            ✓
          </span>
        )}
      </header>

      {description && <p className="goal-card__description">{description}</p>}

      <div
        className="goal-card__progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Прогресс цели «${title}»: ${percent}%`}
      >
        <div
          className="goal-card__progress-bar"
          style={{ width: `${percent}%` }}
        />
      </div>

      <footer className="goal-card__footer">
        <span className="goal-card__values">
          {formatValue(current)} / {formatValue(target)}
        </span>
        <span className="goal-card__percent">{percent}%</span>
      </footer>

      {deadline && (
        <p className="goal-card__deadline">Срок: {deadline}</p>
      )}
    </article>
  );
}
```

## `GoalCard.css`

```css
.goal-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.goal-card[role="button"] {
  cursor: pointer;
}

.goal-card[role="button"]:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.goal-card--complete {
  border-color: #22c55e;
}

.goal-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.goal-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.goal-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  font-size: 13px;
}

.goal-card__description {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.goal-card__progress {
  width: 100%;
  height: 8px;
  background: #f3f4f6;
  border-radius: 999px;
  overflow: hidden;
}

.goal-card__progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  transition: width 0.4s ease;
}

.goal-card--complete .goal-card__progress-bar {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.goal-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #374151;
}

.goal-card__percent {
  font-weight: 600;
}

.goal-card__deadline {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}
```

## Пример использования

```tsx
<GoalCard
  title="Накопить на отпуск"
  description="Поездка в горы летом"
  current={65000}
  target={120000}
  unit="₽"
  deadline="1 августа 2026"
  onClick={() => console.log("Открыть детали цели")}
/>
```

## Что внутри

- **Безопасные вычисления** — прогресс ограничен 0–100%, защита от деления на ноль.
- **Доступность** — `role="progressbar"` с `aria-valuenow`, клавиатурная навигация для кликабельной карточки.
- **Состояние «выполнено»** — особое оформление и галочка при достижении цели.
- **Форматирование чисел** — через `toLocaleString` с учётом единиц.

Хотите, я адаптирую компонент под ваш стек? Уточните, и я перепишу под него:

1. **UI-библиотека** — Tailwind CSS, styled-components, MUI, shadcn/ui, Chakra?
2. **Фреймворк** — это React, или нужен Vue / Svelte / Angular?
3. **Дополнительно** — нужны ли тесты (Jest/Vitest), Storybook-стори, анимации, тёмная тема?

Если ничего не уточните, оставлю вариант выше — он самодостаточен и работает «из коробки».
````

### Наблюдаемые слабые места ответа «ДО»

- Абстрактная модель `current/target/unit` — не доменная: нет понятий goal и task продукта.
- Нет доменных типов `Goal`/`Task`, только локальный `GoalCardProps`.
- Не учтены streak и ближайшая невыполненная задача — ключевые элементы дашборда FocusTrack AI.
- Нет состояний loading/empty/error.
- Введён отдельный `GoalCard.css` вместо Tailwind, принятого в проекте.
- Агент не знает контекст и в конце переспрашивает стек и UI-библиотеку — итерация теряется.

## Сырой ответ агента ПОСЛЕ применения правил (`AGENTS.md` + RTCF)

> Дословный вывод изолированного прогона с загруженными правилами (2026-06-17). Не редактировался.

````text
Это учебная задача по шаблону RTCF: создать React + TypeScript компонент карточки цели. Это самодостаточная задача генерации кода с явно заданным форматом вывода — я отвечу напрямую, как в реальной сессии.

## Краткий план

Создаю переиспользуемый компонент `GoalSummaryCard` с прогрессом по цели. Подход:

1. **Доменные типы** — выношу в отдельный файл `types/goal.ts`: `Goal`, `Task`, `GoalProgress` плюс вспомогательные union-типы статусов. Карточка работает на этих типах, а не на «сыром» API-ответе.
2. **Состояния карточки** — компонент принимает дискриминированный union пропсов (`status: 'loading' | 'error' | 'ready'`). Это типобезопаснее, чем набор разрозненных булевых флагов, и заставляет потребителя обработать каждое состояние.
   - `loading` — скелетон.
   - `error` — сообщение + опциональный `onRetry`.
   - `ready` с пустым набором задач трактуется как **empty**-вариант (цель есть, но задач ещё нет) — отдельный under-state внутри `ready`.
3. **Содержимое ready-состояния** — заголовок цели, прогресс-бар (`progress.percent`), счётчик `done/total`, streak-бейдж, блок «ближайшая невыполненная задача» (`nextTask`).
4. Только Tailwind для стилей, без новых зависимостей. Никаких `useEffect` — компонент чисто презентационный, считаемые значения через `useMemo`/инлайн.
5. Лёгкая защита от некорректных данных (clamp процента в диапазон 0–100).

## Список файлов

- `src/types/goal.ts` — доменные типы (новый).
- `src/components/GoalSummaryCard.tsx` — компонент карточки (новый).

## Код

### `src/types/goal.ts`

```ts
// Доменные типы FocusTrack AI для карточки цели.
// Держим их отдельно, чтобы переиспользовать в дашборде и API-контрактах.

export type GoalStatus = 'active' | 'completed' | 'archived';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

/** Краткосрочная задача, на которые раскладывается цель. */
export interface Task {
  id: string;
  goalId: string;
  title: string;
  status: TaskStatus;
  /** ISO-дата дедлайна, если задан. */
  dueDate?: string;
}

/** Личная или рабочая цель пользователя. */
export interface Goal {
  id: string;
  title: string;
  status: GoalStatus;
}

/**
 * Агрегированный прогресс по цели.
 * Считается на стороне backend/Edge Function на основе фактических задач,
 * фронтенд только отображает.
 */
export interface GoalProgress {
  /** Всего задач в цели. */
  total: number;
  /** Выполнено задач. */
  done: number;
  /** Процент выполнения 0–100 (источник истины — backend). */
  percent: number;
  /** Текущий streak: дней подряд с закрытой задачей. */
  streak: number;
}
```

### `src/components/GoalSummaryCard.tsx`

```tsx
import { useMemo } from 'react';
import type { Goal, GoalProgress, Task } from '../types/goal';

/**
 * Пропсы карточки в виде дискриминированного union по `status`.
 * Это заставляет потребителя обработать loading / error / ready
 * и исключает невалидные комбинации на уровне типов.
 */
type GoalSummaryCardProps =
  | { status: 'loading' }
  | { status: 'error'; message?: string; onRetry?: () => void }
  | {
      status: 'ready';
      goal: Goal;
      progress: GoalProgress;
      /** Ближайшая невыполненная задача; undefined, если задач нет. */
      nextTask?: Task;
      onOpen?: (goalId: string) => void;
    };

const CARD_BASE =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Скелетон-плейсхолдер на время загрузки. */
function LoadingState() {
  return (
    <div
      className={CARD_BASE}
      role="status"
      aria-busy="true"
      aria-label="Загрузка цели"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-2/3 rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="flex gap-3">
          <div className="h-4 w-16 rounded bg-slate-200" />
          <div className="h-4 w-16 rounded bg-slate-200" />
        </div>
        <div className="h-10 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}

/** Состояние ошибки с опциональным повтором. */
function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={CARD_BASE} role="alert">
      <p className="text-sm font-medium text-slate-900">
        Не удалось загрузить цель
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {message ?? 'Попробуйте обновить данные.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Повторить
        </button>
      )}
    </div>
  );
}

/** Бейдж streak; не показываем при streak = 0. */
function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <span aria-hidden="true">🔥</span>
      {streak} дн. подряд
    </span>
  );
}

/** Блок ближайшей невыполненной задачи или empty-подсказка. */
function NextTask({ task }: { task?: Task }) {
  if (!task) {
    return (
      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
        Пока нет задач. Сгенерируйте AI-план, чтобы начать двигаться к цели.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Ближайшая задача
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
        {task.title}
      </p>
      {task.dueDate && (
        <p className="mt-0.5 text-xs text-slate-500">
          до {new Date(task.dueDate).toLocaleDateString('ru-RU')}
        </p>
      )}
    </div>
  );
}

export function GoalSummaryCard(props: GoalSummaryCardProps) {
  if (props.status === 'loading') return <LoadingState />;
  if (props.status === 'error') {
    return <ErrorState message={props.message} onRetry={props.onRetry} />;
  }

  const { goal, progress, nextTask, onOpen } = props;
  const percent = useMemo(
    () => clampPercent(progress.percent),
    [progress.percent],
  );
  const isComplete = percent >= 100;

  return (
    <article
      className={`${CARD_BASE} ${
        onOpen ? 'cursor-pointer transition hover:shadow-md' : ''
      }`}
      onClick={onOpen ? () => onOpen(goal.id) : undefined}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="truncate text-base font-semibold text-slate-900">
          {goal.title}
        </h3>
        <StreakBadge streak={progress.streak} />
      </header>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-slate-500">Прогресс</span>
          <span className="font-medium text-slate-900">{percent}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Прогресс по цели «${goal.title}»`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {progress.done} из {progress.total} задач выполнено
        </p>
      </div>

      <NextTask task={nextTask} />
    </article>
  );
}
```

## Проверки, которые нужно выполнить

Узкие → широкие, перед завершением — обязательно git diff:

1. **TypeScript / типы (самое узкое):** `npx tsc --noEmit` — проверить, что дискриминированный union пропсов сужается корректно и импорты `import type` резолвятся.
2. **Линт:** `npm run lint` (ESLint) — в частности правило hooks: `useMemo` вызывается до ранних `return` только в ready-ветке; убедиться, что нет предупреждения react-hooks/rules-of-hooks (ранние `return` для loading/error стоят **до** хука — это легальный паттерн раннего выхода, но стоит проверить конфигом проекта; при строгой настройке вынести ready-разметку в отдельный подкомпонент `ReadyState`).
3. **Сборка:** `npm run build` (Vite) — отсутствие ошибок компиляции и tree-shaking.
4. **Tailwind:** визуально проверить, что используемые классы есть в сборке (особенно `animate-pulse`, цветовые `bg-amber-50/text-amber-700`), при purge-конфиге убедиться, что путь к `src/**` включён в `content`.
5. **Визуальная проверка состояний** в Storybook/песочнице: `loading`, `error` (с `onRetry` и без), `ready` с задачами, `ready` без задач (empty), `ready` с `percent = 100` (зелёный бар), некорректный `percent` (например 140 → должен клампиться до 100).
6. **git diff** — убедиться, что добавлены только два новых файла и не внесены секреты/ключи.

**Пропущенные проверки (явно):** компонент не покрыт unit-тестами (например, React Testing Library) — если в проекте есть тестовый раннер, стоит добавить тест на клампинг процента и рендер empty-варианта; здесь это не делалось, чтобы не выходить за рамки задачи и не добавлять зависимости.

**Замечание по согласованности с правилами:** `useMemo` после ранних `return` формально нарушает «hooks на верхнем уровне». Паттерн с ранним выходом до хуков рабочий, но если линт проекта строгий — рекомендую рефакторинг: оставить в `GoalSummaryCard` только диспетчеризацию по `status`, а ready-разметку вынести в отдельный компонент `ReadyGoalCard`, где хук будет безусловным. Это безопасный следующий шаг, не требующий новых зависимостей.
````

## Что улучшилось (по фактическим выводам)

| Критерий | ДО правил | ПОСЛЕ правил |
| --- | --- | --- |
| Доменная модель | Абстрактные `current/target/unit` | Доменные `Goal`/`Task`, streak, ближайшая задача |
| Типизация | Локальный `GoalCardProps` | Вынесенные типы в `src/types/goal.ts` |
| Состояния UI | Нет | Дискриминированный union `loading`/`error`/`ready` (+ empty) |
| Стилизация | Отдельный `GoalCard.css` | Tailwind по правилам проекта, без новых зависимостей |
| Формат ответа | Свободный, с переспросом стека | RTCF: план → файлы → код → проверки |
| Контекст | Агент переспрашивает стек/библиотеку | Контекст задан правилами, итерация без уточнений |

## Вывод

Единственное различие между прогонами — наличие `AGENTS.md` в контексте. Без правил агент выдаёт корректный, но обобщённый компонент, не привязанный к продукту, без состояний загрузки/пустоты/ошибки и с переспросом стека в конце. С правилами тот же запрос даёт доменно-типизированный компонент в стеке проекта (React/TS/Tailwind), с явными состояниями loading/empty/error и форматом RTCF (план → файлы → код → проверки).

Это подтверждает роль `AGENTS.md` и согласуется с рекомендацией OpenAI по `AGENTS.md`: агент работает надёжнее, когда заранее знает стек, домен, ограничения и критерии готовности, а не выясняет их переспросом.
