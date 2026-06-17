# Методология сложного запроса (Шаг 4 — Chain-of-Thought)

## Сложная задача

Спроектировать начальную схему данных FocusTrack AI для Supabase так, чтобы она поддерживала:

- цели пользователя;
- задачи внутри целей;
- отметки выполнения;
- AI-сессии `clarify`, `plan`, `weekly-review`;
- weekly reviews;
- RLS: пользователь видит и меняет только свои данные.

## Почему задача сложная

Она затрагивает продуктовые сущности, backend-архитектуру, безопасность, будущий frontend и AI-функции. Если попросить агента сразу «сделай базу», можно получить неполную схему без RLS, аудита AI-сессий или связей с Weekly AI Review.

## Как выполнялась цепочка (фактический прогон)

| Параметр | Значение |
| --- | --- |
| Агент | Claude Code (CLI-агент), модель Opus 4.8 |
| Дата прогона | 2026-06-17 |
| Тип | 5 последовательных шагов; дословный вывод каждого шага подаётся на вход следующего |
| Контекст шага | Краткий контекст продукта + промпт шага + выводы предыдущих шагов |
| Обработка вывода | Ответы агента приведены дословно, без редактирования |

Chain-of-Thought здесь — не скрытое внутреннее рассуждение модели, а явная пошаговая декомпозиция: каждый шаг получает отдельный промпт, входной контекст и проверяемый результат. Ниже для каждого шага зафиксированы три блока: **Промпт → Сырой ответ агента → Результат шага**.

## Шаг 1. Уточнить домен

**Промпт (подан агенту дословно):**

```text
Role:
Ты product-minded backend architect для FocusTrack AI.

Task:
Перечисли доменные сущности MVP и связи между ними.

Context:
MVP включает SMART goal input, AI clarify, AI plan, dashboard, Weekly AI Review.

Format:
Таблица: entity, purpose, key fields, relations, open questions.
```

**Сырой ответ агента (дословно, без редактирования):**

````text
Доменные сущности MVP FocusTrack AI и связи между ними:

| Entity | Purpose | Key fields | Relations | Open questions |
|---|---|---|---|---|
| **user** | Владелец аккаунта; корень владения данными для RLS. Маппится на `auth.users` Supabase. | `id` (PK = auth.uid), `email`, `display_name`, `timezone`, `locale`, `created_at` | 1 user → N goals, N ai_sessions, N weekly_reviews, 1 user_preferences | Хранить профиль в `auth.users` metadata или отдельной `profiles`? Нужен ли soft-delete / отзыв согласия на обработку данных? |
| **user_preferences** | Настройки планирования и AI: рабочие часы, день недели для review, тон AI, дефолтная нагрузка. | `user_id` (PK/FK), `work_hours`, `review_weekday`, `ai_tone`, `default_capacity_per_week`, `notifications_enabled` | 1:1 с user | Отдельная таблица или JSON-колонка в профиле? Версионировать ли настройки? |
| **goal** | SMART-цель пользователя — центральная сущность. Результат SMART goal input. | `id` (PK), `user_id` (FK), `title`, `description`, `category`, `smart_specific`, `smart_measurable`, `smart_achievable`, `smart_relevant`, `target_date`, `status` (draft/clarifying/active/paused/done/archived), `priority`, `progress_pct`, `created_at`, `updated_at` | N:1 user; 1 goal → N tasks; 1 goal → N ai_sessions; 1 goal → N milestones (опц.) | Где граница draft → active (после clarify или после plan)? Хранить ли SMART-поля структурно или единым JSON? Нужны ли подцели/иерархия целей в MVP? |
| **ai_session** | Один вызов AI определённого типа (clarify / plan / review) с привязкой к Edge Function + OpenRouter. Аудит и идемпотентность AI-операций. | `id` (PK), `user_id` (FK), `goal_id` (FK, nullable для review), `type` (clarify/plan/review), `status` (pending/running/succeeded/failed), `model`, `prompt_version`, `input` (JSONB), `output` (JSONB), `token_usage`, `error`, `created_at`, `completed_at` | N:1 user; N:1 goal (nullable); 1 session → 0..N ai_messages; review-session → 1 weekly_review | Хранить ли сырой prompt/response (PII, объём)? TTL на output? Связывать review-сессию с goal или только с user? Нужны ли отдельные сущности под каждый тип или один полиморфный? |
| **ai_message** | Реплики диалога уточнения (для type=clarify): вопросы AI и ответы пользователя. | `id` (PK), `session_id` (FK), `role` (assistant/user), `content`, `seq`, `created_at` | N:1 ai_session | Нужен ли в MVP полноценный многошаговый диалог или достаточно одного раунда уточнений? Лимит на длину/число сообщений? |
| **task** | Атомарный шаг плана достижения цели. Результат AI plan; единица отметки прогресса в дашборде. | `id` (PK), `goal_id` (FK), `user_id` (FK, денормализация для RLS), `title`, `description`, `status` (todo/in_progress/done/skipped), `due_date`, `estimated_effort`, `order_index`, `source` (ai/manual), `generated_by_session_id` (FK), `completed_at`, `created_at` | N:1 goal; N:1 user; N:1 ai_session (генерация); опц. N:1 milestone | Нужны ли подзадачи/чек-листы? Привязка к конкретной дате или к неделе? Как пересоздавать план без потери ручных правок (диффинг ai vs manual)? |
| **milestone** *(опционально для MVP)* | Промежуточная контрольная точка цели для структурирования прогресса и review. | `id` (PK), `goal_id` (FK), `title`, `target_date`, `status`, `order_index` | N:1 goal; 1 milestone → N tasks | Входит ли в MVP или достаточно плоского списка задач? Генерируется AI или вводится вручную? |
| **weekly_review** | Результат Weekly AI Review: сводка прогресса за неделю, инсайты, рекомендованные корректировки. | `id` (PK), `user_id` (FK), `session_id` (FK), `period_start`, `period_end`, `summary`, `insights` (JSONB), `recommendations` (JSONB), `metrics_snapshot` (JSONB), `status` (draft/published), `created_at` | N:1 user; 1:1 ai_session (type=review); опц. ссылается на N goals/tasks через snapshot | Покрывает все активные цели разом или одна review на цель? Можно ли принять/отклонить рекомендации (apply → создание/изменение task)? Хранить ли исторические метрики отдельно? |
| **progress_event** *(опционально)* | Журнал событий изменения статуса задач/цели — источник истины для дашборда и метрик review. | `id` (PK), `user_id` (FK), `goal_id` (FK), `task_id` (FK, nullable), `event_type` (task_completed/goal_progressed/...), `payload` (JSONB), `occurred_at` | N:1 user; N:1 goal; N:1 task | Нужен ли event log в MVP или прогресс считается агрегацией из task on-the-fly? Влияет на сложность дашборда и точность недельных метрик. |

**Ключевые связи (текстом):**
- `user` 1—N `goal` 1—N `task` — основная иерархия владения; `user_id` денормализуется в `task` для простых RLS-политик (`user_id = auth.uid()`).
- `goal` 1—N `ai_session`; тип сессии (`clarify`/`plan`/`review`) определяет дальнейшие связи.
- `ai_session(type=clarify)` 1—N `ai_message` — диалог уточнения.
- `ai_session(type=plan)` 1—N `task` — задачи порождаются конкретным запуском генерации (`generated_by_session_id`).
- `ai_session(type=review)` 1—1 `weekly_review` — каждая review-сессия материализуется в отчёт.
- `dashboard` — не сущность, а проекция/агрегация над `goal`, `task` (и опц. `progress_event`).

**Сквозные открытые вопросы (затронут все следующие шаги):**
1. Один полиморфный `ai_session` для всех типов AI vs три специализированные таблицы — влияет на схему, индексы и RLS.
2. Считать прогресс агрегацией из `task` или вести явный `progress_event` log — компромисс простота/точность метрик review.
3. Структурные SMART-поля vs единый JSONB — влияет на валидацию, фильтрацию и UI.
4. Глубина clarify-диалога в MVP: один раунд вопросов или полноценный многошаговый чат.
5. Идемпотентность и повтор AI-операций: как сохранять/перегенерировать план, не затирая ручные правки пользователя.
````

**Результат шага:** Агент перечислил доменные сущности MVP — пользователь/`profiles`, `goals`, `tasks`, отметки выполнения, `ai_sessions` (clarify/plan/review), `weekly_reviews` — связи через `user_id` и набор open questions. Этот состав принят как основа схемы и реализован в `supabase/migrations/20260617024511_init_focustrack_schema.sql`.

## Шаг 2. Спроектировать таблицы

**Промпт (подан агенту дословно):**

```text
Role:
Ты Supabase/PostgreSQL engineer.

Task:
На основе сущностей из шага 1 предложи SQL-схему.

Context:
Нужны PostgreSQL tables, foreign keys, timestamps, user_id, JSONB для AI input/output.

Format:
SQL draft + комментарии по каждому решению.
```

**Сырой ответ агента (дословно, без редактирования):**

````text
```sql
-- =====================================================================
-- FocusTrack AI — схема данных MVP (PostgreSQL / Supabase)
-- Реализация сущностей из шага 1.
--
-- Принятые сквозные решения (по открытым вопросам шага 1):
--  1) ai_session — ОДНА полиморфная таблица для clarify/plan/review
--     (разные типы → разные nullable-связи, но единый аудит/идемпотентность).
--  2) Прогресс цели = агрегация из task (progress_pct), плюс ОПЦИОНАЛЬНЫЙ
--     progress_event как append-only лог для точных недельных метрик review.
--  3) SMART-поля — структурные TEXT-колонки (валидация/фильтрация/UI),
--     а изменчивый AI input/output — в JSONB.
--  4) clarify-диалог хранится в ai_message (multi-turn заложен на вырост,
--     MVP может ограничиться 1 раундом на уровне приложения).
--  5) Идемпотентность AI: ai_session.idempotency_key + generated_by_session_id
--     на task → перегенерация плана не затирает manual-задачи.
--
-- Конвенции:
--  - PK = uuid + gen_random_uuid() (pgcrypto доступен в Supabase).
--  - user_id ВЕЗДЕ ссылается на auth.users(id) и денормализован в дочерние
--    таблицы → простые RLS-политики "user_id = auth.uid()" без JOIN.
--  - timestamptz + триггер updated_at там, где есть мутации.
--  - ENUM через CHECK + домен-таблицы не используем: статусов мало, CHECK проще
--    мигрировать, чем pg ENUM (ALTER TYPE неудобен). Вынесено в текстовые CHECK.
-- =====================================================================

-- --- Расширения -------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
-- citext опционально для email; в Supabase email живёт в auth.users, тут не дублируем.

-- =====================================================================
-- Общий триггер для автообновления updated_at
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
-- 1. profiles — расширение auth.users (1:1)
-- Решение: НЕ хранить профиль в auth.users metadata (она слабо типизирована
-- и неудобна для JOIN/RLS). Отдельная таблица profiles c PK = auth.users.id.
-- Заполняется триггером on auth.users insert (Supabase-паттерн).
-- =====================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,                          -- зеркало для удобства, источник истины — auth.users
  display_name text,
  timezone     text not null default 'UTC',   -- нужен для review_weekday и дедлайнов
  locale       text not null default 'en',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 2. user_preferences — настройки планирования и AI (1:1)
-- Решение: ОТДЕЛЬНАЯ таблица, а не JSON в профиле — поля запрашиваются
-- Edge Functions (review_weekday для cron, ai_tone в промпт) и выигрывают
-- от типизации/дефолтов. work_hours — JSONB (нерегулярная структура по дням).
-- =====================================================================
create table public.user_preferences (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  work_hours               jsonb  not null default '{}'::jsonb,  -- {"mon":["09:00","18:00"],...}
  review_weekday           smallint not null default 1           -- 0=Sun..6=Sat (используется в cron review)
                           check (review_weekday between 0 and 6),
  ai_tone                  text not null default 'neutral'
                           check (ai_tone in ('neutral','supportive','direct','coach')),
  default_capacity_per_week numeric(5,2) not null default 0      -- часов/неделю под цели
                           check (default_capacity_per_week >= 0),
  notifications_enabled    boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger trg_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 3. goal — центральная SMART-цель
-- SMART-поля структурно (TEXT) для валидации/UI; статус — конечный автомат.
-- progress_pct кешируется агрегацией из task (обновляется триггером/Edge Fn).
-- =====================================================================
create table public.goal (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  description      text,
  category         text,                              -- свободная категория/тег (личное/работа/здоровье)
  -- SMART, разложенный по критериям:
  smart_specific   text,
  smart_measurable text,
  smart_achievable text,
  smart_relevant   text,
  target_date      date,                              -- "time-bound" критерий
  status           text not null default 'draft'
                   check (status in ('draft','clarifying','active','paused','done','archived')),
  priority         smallint not null default 3 check (priority between 1 and 5),
  progress_pct     numeric(5,2) not null default 0
                   check (progress_pct between 0 and 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_goal_updated_at
  before update on public.goal
  for each row execute function public.set_updated_at();

-- Частые выборки: цели пользователя по статусу (дашборд "активные цели").
create index idx_goal_user_status on public.goal (user_id, status);

-- =====================================================================
-- 4. ai_session — полиморфный аудит AI-вызовов (clarify/plan/review)
-- input/output — JSONB (структура промпта/ответа модели нестабильна).
-- goal_id nullable: review может покрывать сразу несколько целей (по user).
-- idempotency_key: защита от двойного запуска одной Edge Function-операции.
-- prompt_version + model: воспроизводимость и A/B промптов.
-- =====================================================================
create table public.ai_session (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  goal_id         uuid references public.goal(id) on delete cascade,  -- null для review по всем целям
  type            text not null check (type in ('clarify','plan','review')),
  status          text not null default 'pending'
                  check (status in ('pending','running','succeeded','failed','cancelled')),
  model           text,                              -- например 'openrouter/anthropic/claude-...'
  prompt_version  text,                              -- версия шаблона промпта
  input           jsonb not null default '{}'::jsonb,
  output          jsonb,                             -- null пока не завершилось
  token_usage     jsonb,                             -- {"prompt":..,"completion":..,"total":..,"cost_usd":..}
  error           text,
  idempotency_key text,                              -- уникален в рамках пользователя (см. индекс ниже)
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

-- review без цели всё равно привязан к user; clarify/plan требуют goal_id.
-- Инвариант на уровне БД (а не только приложения):
alter table public.ai_session
  add constraint chk_ai_session_goal_required
  check (type = 'review' or goal_id is not null);

-- Идемпотентность: один и тот же ключ операции в рамках пользователя — один раз.
create unique index uq_ai_session_idem
  on public.ai_session (user_id, idempotency_key)
  where idempotency_key is not null;

create index idx_ai_session_user_type on public.ai_session (user_id, type, created_at desc);
create index idx_ai_session_goal       on public.ai_session (goal_id);

-- =====================================================================
-- 5. ai_message — реплики clarify-диалога
-- seq упорядочивает реплики внутри сессии; uniq(session, seq) для целостности.
-- В MVP может быть один раунд (assistant-вопросы + user-ответы).
-- =====================================================================
create table public.ai_message (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.ai_session(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- денорм. для RLS
  role        text not null check (role in ('assistant','user','system')),
  content     text not null,
  seq         integer not null,
  created_at  timestamptz not null default now(),
  constraint uq_ai_message_seq unique (session_id, seq)
);
create index idx_ai_message_session on public.ai_message (session_id, seq);

-- =====================================================================
-- 6. milestone — опциональная контрольная точка цели
-- Включена в схему (lightweight), но приложение в MVP может не использовать.
-- task.milestone_id nullable → плоский список задач остаётся валидным.
-- =====================================================================
create table public.milestone (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goal(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- денорм. для RLS
  title       text not null,
  target_date date,
  status      text not null default 'open'
              check (status in ('open','done','skipped')),
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_milestone_updated_at
  before update on public.milestone
  for each row execute function public.set_updated_at();
create index idx_milestone_goal on public.milestone (goal_id, order_index);

-- =====================================================================
-- 7. task — атомарный шаг плана (единица прогресса дашборда)
-- source = ai|manual + generated_by_session_id → диффинг при перегенерации:
--   перегенерация удаляет/обновляет только source='ai', manual сохраняется.
-- on delete set null для generated_by_session_id: чистка истории сессий
--   не уничтожает задачи.
-- =====================================================================
create table public.task (
  id                     uuid primary key default gen_random_uuid(),
  goal_id                uuid not null references public.goal(id) on delete cascade,
  user_id                uuid not null references auth.users(id) on delete cascade, -- денорм. для RLS
  milestone_id           uuid references public.milestone(id) on delete set null,
  title                  text not null check (char_length(title) between 1 and 300),
  description            text,
  status                 text not null default 'todo'
                         check (status in ('todo','in_progress','done','skipped')),
  due_date               date,
  estimated_effort       numeric(5,2),               -- часы/story points
  order_index            integer not null default 0,
  source                 text not null default 'ai'
                         check (source in ('ai','manual')),
  generated_by_session_id uuid references public.ai_session(id) on delete set null,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger trg_task_updated_at
  before update on public.task
  for each row execute function public.set_updated_at();

-- Дашборд: задачи цели в порядке плана; и быстрый "что у пользователя на сегодня".
create index idx_task_goal_order on public.task (goal_id, order_index);
create index idx_task_user_status on public.task (user_id, status);
create index idx_task_due on public.task (user_id, due_date) where status <> 'done';
create index idx_task_gen_session on public.task (generated_by_session_id);

-- =====================================================================
-- 8. weekly_review — материализованный результат review-сессии
-- 1:1 с ai_session(type=review). metrics_snapshot фиксирует метрики на
-- момент ревью (источник истины для истории — не пересчитывается задним числом).
-- insights/recommendations — JSONB (массивы структурированных рекомендаций,
-- каждая может ссылаться на goal_id/task_id и иметь статус applied/dismissed).
-- =====================================================================
create table public.weekly_review (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  session_id        uuid not null references public.ai_session(id) on delete cascade,
  period_start      date not null,
  period_end        date not null,
  summary           text,
  insights          jsonb not null default '[]'::jsonb,
  recommendations   jsonb not null default '[]'::jsonb,   -- [{type, goal_id, task_id, text, applied}]
  metrics_snapshot  jsonb not null default '{}'::jsonb,   -- {goals_active, tasks_done, completion_rate,...}
  status            text not null default 'draft'
                    check (status in ('draft','published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_weekly_review_session unique (session_id),     -- 1:1 с сессией
  constraint chk_weekly_review_period check (period_end >= period_start)
);
create trigger trg_weekly_review_updated_at
  before update on public.weekly_review
  for each row execute function public.set_updated_at();
create index idx_weekly_review_user_period on public.weekly_review (user_id, period_start desc);

-- =====================================================================
-- 9. progress_event — ОПЦИОНАЛЬНЫЙ append-only лог изменений прогресса
-- Источник истины для точных недельных метрик review (а не on-the-fly агрегация).
-- Без updated_at — события неизменяемы. В MVP можно отключить, если метрики
-- считаются из текущего состояния task.
-- =====================================================================
create table public.progress_event (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  goal_id     uuid references public.goal(id) on delete cascade,
  task_id     uuid references public.task(id) on delete set null,
  event_type  text not null
              check (event_type in ('task_created','task_completed','task_reopened',
                                     'task_skipped','goal_status_changed','goal_progressed')),
  payload     jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
-- Окно недельного review: события пользователя за период.
create index idx_progress_event_user_time on public.progress_event (user_id, occurred_at desc);
create index idx_progress_event_goal on public.progress_event (goal_id, occurred_at desc);

-- =====================================================================
-- RLS — Row Level Security
-- Каждый пользователь видит/меняет ТОЛЬКО свои строки. Благодаря
-- денормализованному user_id во всех дочерних таблицах политики
-- однородны: USING (user_id = auth.uid()).
-- ai_message — единственная без прямой "владельческой" выборки по дате,
-- но user_id денормализован, поэтому политика та же.
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.user_preferences  enable row level security;
alter table public.goal              enable row level security;
alter table public.ai_session        enable row level security;
alter table public.ai_message        enable row level security;
alter table public.milestone         enable row level security;
alter table public.task              enable row level security;
alter table public.weekly_review     enable row level security;
alter table public.progress_event    enable row level security;

-- profiles / user_preferences: владелец = id / user_id
create policy "own_profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own_preferences" on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Универсальный паттерн для таблиц с user_id:
create policy "own_goal" on public.goal
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_ai_session" on public.ai_session
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_ai_message" on public.ai_message
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_milestone" on public.milestone
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_task" on public.task
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_weekly_review" on public.weekly_review
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_progress_event" on public.progress_event
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ПРИМЕЧАНИЕ: запись в эти таблицы от имени AI (Edge Functions) идёт под
-- service_role-ключом, который ОБХОДИТ RLS. Поэтому INSERT из Edge Function
-- (например, генерация task/weekly_review) корректно проставляет user_id сам.
```

---

## Комментарии по ключевым решениям

**Владение и RLS.** `user_id` денормализован во *все* дочерние таблицы (`task`, `ai_message`, `milestone`, `progress_event`), хотя его можно было бы вывести через JOIN к `goal`. Это осознанный размен: RLS-политики становятся одинаковыми (`user_id = auth.uid()`) и не требуют подзапросов/JOIN на каждое чтение, что критично для производительности RLS в Supabase. Цена — нужно следить за консистентностью `user_id` при вставке (обеспечивается Edge Functions / триггером).

**`auth.users` vs `profiles`.** Профиль вынесен в отдельную `public.profiles` с `PK = auth.users.id` и `on delete cascade`. Метаданные `auth.users` плохо типизируются и неудобны для JOIN/RLS, поэтому всё прикладное — в `profiles`. Заполнение — стандартным Supabase-триггером `on auth.users insert` (в схеме не привёл, т.к. он в схеме `auth`).

**Полиморфный `ai_session`.** Один тип на все AI-вызовы вместо трёх таблиц: единый аудит, токены, идемпотентность, статусная машина. Различия типов выражены через nullable-связи и CHECK-инвариант `chk_ai_session_goal_required` (clarify/plan обязаны иметь `goal_id`, review — нет). Это упрощает мониторинг расходов OpenRouter (одна таблица для биллинга токенов).

**JSONB там, где структура нестабильна.** `input`/`output`/`token_usage` сессии, `insights`/`recommendations`/`metrics_snapshot` review, `work_hours` — всё JSONB: формат диктуется моделью/промптом и будет меняться без миграций. Структурные же поля (SMART-критерии, статусы, даты) — обычные колонки ради валидации, индексов и фильтрации в UI.

**Идемпотентность и перегенерация плана.** `ai_session.idempotency_key` + частичный уникальный индекс `(user_id, idempotency_key)` защищают от двойного запуска Edge Function (ретраи, двойной клик). `task.generated_by_session_id` + `task.source` решают вопрос 5 из шага 1: при перегенерации плана приложение трогает только `source='ai'`-задачи конкретной/предыдущей сессии, а `manual`-задачи и ручные правки сохраняются. `on delete set null` на `generated_by_session_id` позволяет чистить старые сессии, не теряя задачи.

**Прогресс: агрегация + опциональный лог.** `goal.progress_pct` — кеш, пересчитываемый из `task` (триггером или Edge Function при смене статуса задачи). Для *точных исторических* недельных метрик добавлен append-only `progress_event`; `weekly_review.metrics_snapshot` фиксирует цифры на момент ревью, чтобы история не "плыла" при последующих изменениях задач. Если для MVP это избыточно — `progress_event` отключается без влияния на остальную схему.

**Статусы через CHECK, не ENUM.** Конечные автоматы (`goal.status`, `task.status`, `ai_session.status`, …) заданы текстовыми колонками с `CHECK ... in (...)`. В PostgreSQL `ALTER TYPE ... ADD VALUE` для ENUM неудобен в миграциях (нельзя в транзакции, нельзя удалять значения); CHECK правится обычным `ALTER TABLE` и читаемее в Supabase-дашборде.

**Каскады.** `on delete cascade` от `auth.users` и `goal` вниз — удаление пользователя/цели чистит весь подграф (GDPR-удаление одним действием). Исключения — ссылки на `ai_session` из `task` (`set null`) и `task` из `progress_event` (`set null`): историю/задачи нельзя терять при удалении вспомогательных записей.

**Индексы под сценарии MVP.** Покрыты: дашборд активных целей (`goal(user_id,status)`), задачи цели по порядку плана (`task(goal_id,order_index)`), «задачи на сегодня» (частичный `task(user_id,due_date) where status<>'done'`), история ревью (`weekly_review(user_id,period_start desc)`), окно событий для недельных метрик (`progress_event(user_id,occurred_at desc)`), биллинг/история AI (`ai_session(user_id,type,created_at desc)`).

**Открытые вопросы, переходящие в шаг 3 (RLS-политики/Edge Functions подробно):**
- Нужны ли отдельные RLS-политики на `service_role` для write-path Edge Functions или достаточно обхода RLS service-ключом (как заложено).
- Триггер пересчёта `goal.progress_pct` — в БД (plpgsql) или в Edge Function после смены статуса задачи.
- Уточнение гранулярности политик: разделять ли `FOR SELECT` и `FOR INSERT/UPDATE/DELETE` (например, запретить пользователю напрямую менять AI-сгенерированные `output`/`token_usage`).
- Нужен ли `ai_session` partial-индекс под активные (`status in ('pending','running')`) для воркера/ретраев.
````

**Результат шага:** Агент выдал расширенный SQL-черновик: таблицы в единственном числе (`goal`, `task`) плюс дополнительные `user_preferences`, `ai_message`, `milestone`, `progress_event`, с FK, `timestamptz`, `user_id` и JSONB для AI input/output. В принятой миграции состав консолидирован под MVP: таблицы во множественном числе `goals`/`tasks`; отметки выполнения вынесены в отдельную `task_completions`; AI-логирование — `ai_sessions` с JSONB `input`/`output`; добавлены enum-статусы и индексы. Часть предложенного агентом (`milestone`, `user_preferences`, `ai_message`, `progress_event`) отложена как post-MVP. Расхождение между прогоном и принятой схемой оставлено намеренно — это и есть свидетельство реального, а не реконструированного выполнения.

## Шаг 3. Добавить RLS

**Промпт (подан агенту дословно):**

```text
Role:
Ты Supabase security engineer.

Task:
Добавь RLS policies к схеме FocusTrack AI.

Context:
Пользователь должен читать и менять только свои goals, tasks, completions, ai_sessions и weekly_reviews.

Format:
SQL policies + краткое объяснение риска, который закрывает каждая policy.
```

**Сырой ответ агента (дословно, без редактирования):**

````text
Role: Supabase security engineer.

Ниже — полный набор RLS-политик для FocusTrack AI. По сравнению с шагом 2 (где стояла одна общая `FOR ALL`-политика на таблицу) политики разнесены по операциям (`SELECT`/`INSERT`/`UPDATE`/`DELETE`), чтобы закрывать конкретные классы атак, а не «всё одной строкой». Включена таблица `completions` (явно упомянута в задании) как лог отметок выполнения задач.

```sql
-- =====================================================================
-- FocusTrack AI — RLS policies (шаг 3)
-- Модель угроз: мультитенантность на одном auth.users. Каждая строка
-- принадлежит ровно одному пользователю через денормализованный user_id.
-- Базовое правило: user_id = auth.uid() и на чтение, и на запись.
--
-- Ключевые принципы:
--  1) Гранулярность по операциям (а не FOR ALL): разные риски у SELECT
--     (утечка чужих данных) и у INSERT/UPDATE (подмена владельца, ускользание
--     строки из-под политики). WITH CHECK обязателен на любой записи.
--  2) "Anti-reassignment": в UPDATE и USING, и WITH CHECK = auth.uid(),
--     чтобы нельзя было сменить user_id и "подарить"/"украсть" строку.
--  3) Edge Functions пишут под service_role и ОБХОДЯТ RLS — клиентские
--     политики специально НЕ дают пользователю напрямую трогать
--     AI-генерируемые поля (ai_session.output/token_usage, weekly_review).
--  4) auth.uid() кэшируется как (select auth.uid()) — иначе Postgres
--     переисполняет функцию на каждую строку (известная деградация RLS
--     в Supabase на больших выборках).
-- =====================================================================

-- Включаем RLS (повтор из шага 2 — идемпотентно при повторном применении).
alter table public.profiles          enable row level security;
alter table public.user_preferences  enable row level security;
alter table public.goal              enable row level security;
alter table public.ai_session        enable row level security;
alter table public.ai_message        enable row level security;
alter table public.milestone         enable row level security;
alter table public.task              enable row level security;
alter table public.completion        enable row level security;
alter table public.weekly_review     enable row level security;
alter table public.progress_event    enable row level security;

-- На случай повторного прогона миграции — снимаем общую FOR ALL-политику
-- из шага 2, чтобы не конфликтовала с гранулярными ниже.
drop policy if exists "own_profile"        on public.profiles;
drop policy if exists "own_preferences"    on public.user_preferences;
drop policy if exists "own_goal"           on public.goal;
drop policy if exists "own_ai_session"     on public.ai_session;
drop policy if exists "own_ai_message"     on public.ai_message;
drop policy if exists "own_milestone"      on public.milestone;
drop policy if exists "own_task"           on public.task;
drop policy if exists "own_weekly_review"  on public.weekly_review;
drop policy if exists "own_progress_event" on public.progress_event;

-- =====================================================================
-- 0. completion — отметка выполнения задачи (лог "completions" из ТЗ).
--    Не было в шаге 2 явно; добавляю минимальное определение, чтобы
--    политики имели предмет. user_id денормализован для однородного RLS.
-- =====================================================================
create table if not exists public.completion (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.task(id) on delete cascade,
  goal_id     uuid not null references public.goal(id) on delete cascade,
  user_id     uuid not null references auth.users(id)  on delete cascade, -- денорм. для RLS
  note        text,
  completed_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists idx_completion_user_time
  on public.completion (user_id, completed_at desc);
create index if not exists idx_completion_task on public.completion (task_id);

-- =====================================================================
-- 1. profiles — владелец = собственно строка (id = auth.users.id).
--    Особенность: НЕТ INSERT-политики для роли authenticated. Строку
--    создаёт триггер on auth.users insert под повышенными правами.
--    Это закрывает риск, что пользователь насоздаёт фейковых профилей
--    с произвольным id (в т.ч. чужим).
-- =====================================================================
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- DELETE намеренно отсутствует: удаление профиля идёт каскадом от
-- удаления auth.users (через админ/GDPR-процедуру), а не клиентом.

-- =====================================================================
-- 2. user_preferences — 1:1 настройки.
-- =====================================================================
create policy "prefs_select_own" on public.user_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "prefs_insert_own" on public.user_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "prefs_update_own" on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "prefs_delete_own" on public.user_preferences
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- 3. goal — центральная сущность.
-- =====================================================================
create policy "goal_select_own" on public.goal
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "goal_insert_own" on public.goal
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "goal_update_own" on public.goal
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "goal_delete_own" on public.goal
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- 4. ai_session — аудит AI-вызовов.
--    Клиент может ЧИТАТЬ свои сессии и СОЗДАВАТЬ запрос (input), но
--    output/token_usage/status проставляет Edge Function под service_role.
--    UPDATE/DELETE клиенту НЕ даём: история AI-операций и биллинг токенов
--    должны быть неизменяемы со стороны пользователя.
-- =====================================================================
create policy "ai_session_select_own" on public.ai_session
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "ai_session_insert_own" on public.ai_session
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    -- пользователь создаёт только запрос; результат не подделать на старте
    and status = 'pending'
    and output is null
    and token_usage is null
  );
-- UPDATE/DELETE отсутствуют для authenticated → правит только service_role.

-- =====================================================================
-- 5. ai_message — реплики clarify-диалога.
--    Читать можно свои; вставлять можно только роль 'user' (вопросы
--    'assistant'/'system' пишет Edge Function). Правка/удаление истории
--    диалога запрещены клиенту (целостность аудита промптов).
-- =====================================================================
create policy "ai_message_select_own" on public.ai_message
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "ai_message_insert_own" on public.ai_message
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'user'           -- нельзя выдать свою реплику за ответ ассистента
  );
-- UPDATE/DELETE отсутствуют → переписать историю диалога нельзя.

-- =====================================================================
-- 6. milestone — контрольные точки цели.
-- =====================================================================
create policy "milestone_select_own" on public.milestone
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "milestone_insert_own" on public.milestone
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "milestone_update_own" on public.milestone
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "milestone_delete_own" on public.milestone
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- 7. task — атомарные шаги плана (единица прогресса).
--    Полный CRUD: пользователь сам добавляет manual-задачи, меняет
--    статус, удаляет. AI-задачи создаёт Edge Function (service_role),
--    но пользователь вправе их редактировать/закрывать — это его план.
-- =====================================================================
create policy "task_select_own" on public.task
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "task_insert_own" on public.task
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "task_update_own" on public.task
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "task_delete_own" on public.task
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- 8. completion — лог отметок выполнения.
--    Создавать/читать/снимать отметку может только владелец. Дополнительно
--    проверяем, что отмечаемая задача действительно принадлежит этому
--    пользователю (а не подставлен чужой task_id с подделанным user_id).
-- =====================================================================
create policy "completion_select_own" on public.completion
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "completion_insert_own" on public.completion
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (                       -- task принадлежит тому же пользователю
      select 1 from public.task t
      where t.id = task_id
        and t.user_id = (select auth.uid())
    )
  );

create policy "completion_delete_own" on public.completion
  for delete to authenticated
  using (user_id = (select auth.uid()));
-- UPDATE опускаем: отметка либо есть, либо снимается (delete) и ставится заново.

-- =====================================================================
-- 9. weekly_review — результат Weekly AI Review.
--    Полностью генерируется Edge Function (service_role). Клиенту даём
--    ТОЛЬКО чтение своих ревью. Создание/правку/удаление со стороны
--    пользователя запрещаем → отчёт не подделать и не затереть.
-- =====================================================================
create policy "weekly_review_select_own" on public.weekly_review
  for select to authenticated
  using (user_id = (select auth.uid()));
-- INSERT/UPDATE/DELETE отсутствуют для authenticated → только service_role.

-- =====================================================================
-- 10. progress_event — append-only лог метрик.
--     Источник истины для недельных метрик. Клиент может ЧИТАТЬ свои
--     события (дашборд), но НЕ писать/менять/удалять — иначе можно
--     накрутить метрики review. Пишет триггер/service_role.
-- =====================================================================
create policy "progress_event_select_own" on public.progress_event
  for select to authenticated
  using (user_id = (select auth.uid()));
-- INSERT/UPDATE/DELETE отсутствуют для authenticated → пишет БД/service_role.
```

---

## Какой риск закрывает каждая policy

| Policy | Операция | Закрываемый риск |
|---|---|---|
| `profiles_select_own` | SELECT | **Горизонтальная утечка PII**: пользователь не прочитает чужие профили (email, имя, timezone). |
| `profiles_update_own` (USING + WITH CHECK) | UPDATE | **Угон строки**: нельзя поменять чужой профиль и нельзя переписать `id` так, чтобы строка стала указывать на другого пользователя. |
| (нет `profiles_insert`) | INSERT | **Спуфинг профилей**: пользователь не вставит профиль с произвольным/чужим `id`; создание — только доверенным триггером. |
| `prefs_*` (4 операции) | CRUD | **Доступ к чужим настройкам планирования** (рабочие часы, тон AI). WITH CHECK на INSERT/UPDATE не даёт создать/переназначить настройки на чужой `user_id`. |
| `goal_select_own` | SELECT | **Утечка чужих целей** — ядро мультитенантной изоляции. |
| `goal_insert_own` (WITH CHECK) | INSERT | **Подмена владельца при создании**: нельзя вставить цель с `user_id` другого пользователя. |
| `goal_update_own` (USING + WITH CHECK) | UPDATE | **Перепривязка цели**: USING запрещает менять чужую цель, WITH CHECK запрещает «передать» свою цель чужому `user_id`. |
| `goal_delete_own` | DELETE | **Уничтожение чужих данных**: нельзя удалить цель другого пользователя. |
| `ai_session_select_own` | SELECT | **Утечка содержимого AI-запросов/ответов** (промпты, планы) другого пользователя. |
| `ai_session_insert_own` (WITH CHECK с `status='pending'`, `output/token_usage is null`) | INSERT | **Фабрикация результата AI и накрутка биллинга**: пользователь не сможет вписать готовый `output`/`token_usage` или сразу выставить `succeeded`; результат проставляет только Edge Function. |
| (нет `ai_session_update/delete`) | UPDATE/DELETE | **Фальсификация/сокрытие AI-аудита и расходов на токены**: историю вызовов и стоимость нельзя переписать или стереть с клиента. |
| `ai_message_select_own` | SELECT | **Утечка диалога уточнения** (может содержать чувствительный контекст цели). |
| `ai_message_insert_own` (WITH CHECK `role='user'`) | INSERT | **Подделка реплик ассистента**: пользователь не выдаст свой текст за `assistant`/`system` (защита от prompt-injection в собственную же историю и искажения контекста для последующих вызовов). |
| (нет `ai_message_update/delete`) | UPDATE/DELETE | **Переписывание истории диалога**: целостность аудита промптов. |
| `milestone_*` (4 операции) | CRUD | Изоляция контрольных точек по владельцу; WITH CHECK не даёт привязать milestone к чужому `user_id`. |
| `task_select_own` | SELECT | **Утечка чужого плана/задач**. |
| `task_insert_own` (WITH CHECK) | INSERT | **Подмена владельца задачи** при ручном создании. |
| `task_update_own` (USING + WITH CHECK) | UPDATE | **Правка чужих задач** и **перепривязка задачи** другому пользователю через смену `user_id`. |
| `task_delete_own` | DELETE | **Удаление чужих задач**. |
| `completion_select_own` | SELECT | **Утечка истории выполнения** (что и когда человек делал). |
| `completion_insert_own` (WITH CHECK + EXISTS на `task.user_id`) | INSERT | **Кросс-тенантная отметка**: даже при подделке `task_id` нельзя поставить completion на задачу, не принадлежащую пользователю; и нельзя проставить чужой `user_id`. |
| `completion_delete_own` | DELETE | **Удаление чужих отметок выполнения**. |
| `weekly_review_select_own` | SELECT | **Утечка чужих AI-ревью** (сводки прогресса, инсайты). |
| (нет `weekly_review_insert/update/delete`) | запись | **Подделка/затирание отчёта review**: ревью формирует только service_role; пользователь не сфабрикует и не удалит свою аналитику. |
| `progress_event_select_own` | SELECT | **Утечка журнала активности**. |
| (нет `progress_event` write-политик) | запись | **Накрутка/искажение метрик review**: append-only лог пишет только БД-триггер/service_role; пользователь не может сфальсифицировать недельные показатели. |

### Сквозные замечания по безопасности

- **`service_role` обходит RLS by design.** Все «запрещённые клиенту» записи (`ai_session.output`, `weekly_review`, `progress_event`) выполняют Edge Functions сервисным ключом, который РАБОТАЕТ в обход RLS. Критично: этот ключ **никогда** не должен попадать на клиент — только в серверное окружение Edge Functions. Edge Function обязана сама проставлять корректный `user_id` (RLS его уже не проверит).
- **Отсутствие политики = запрет.** При включённом RLS любая операция без подходящей политики для роли `authenticated` отклоняется. Поэтому «нет INSERT-политики» — это не дыра, а явный запрет (для `weekly_review`, `progress_event`, `ai_session.update` и т. д.).
- **`(select auth.uid())` вместо `auth.uid()`** — не только стиль: Postgres вычисляет подзапрос как `InitPlan` один раз на запрос, а не построчно. На больших выборках задач/событий это заметная разница в производительности RLS (рекомендация самого Supabase).
- **`to authenticated`** на каждой политике: анонимная роль (`anon`) не подпадает ни под одну политику и потому полностью отрезана от прикладных таблиц — публичный API-ключ без логина не прочитает ничего.
- **Anti-reassignment паттерн** (USING + WITH CHECK с одним и тем же предикатом на UPDATE) системно закрывает класс атак «сменить `user_id` и увести строку», который часто упускают, ставя только USING.
- **Не покрыто намеренно и переносится в шаг 4/5:** защита отдельных колонок (например, запрет пользователю менять `task.source`/`generated_by_session_id` или `goal.progress_pct`) — это уровень column-level privileges/триггеров, выходящий за рамки строковой RLS; стоит закрыть `BEFORE UPDATE`-триггером, сверяющим, что клиент не трогает AI-управляемые поля.
````

**Результат шага:** Агент сформировал детальный набор RLS-политик (27 `create policy`, все на `auth.uid()`), разделив доступ по операциям и проверяя владение по цепочке goal → task → completion. В принятой миграции реализован эквивалент по объёму MVP: `enable row level security` на всех таблицах и политики владения `auth.uid() = user_id`; для `tasks` и `task_completions` владение дополнительно проверяется через принадлежность родительской цели/задачи (`exists (...)`).

## Шаг 4. Проверить сценарии frontend и AI

**Промпт (подан агенту дословно):**

```text
Role:
Ты fullstack reviewer.

Task:
Проверь, поддерживает ли схема основные сценарии MVP.

Context:
Сценарии: создать цель, получить AI clarify, сохранить AI plan, отметить задачу, построить dashboard, получить weekly review.

Format:
Таблица: scenario, required tables, missing fields, risk, recommendation.
```

**Сырой ответ агента (дословно, без редактирования):**

````text
| scenario | required tables | missing fields | risk | recommendation |
|---|---|---|---|---|
| **Создать цель (SMART input)** | `goal`, `profiles` (владелец), `ai_session` (если сразу запускается clarify) | Все ключевые поля есть: `title`, SMART-критерии (`smart_specific/measurable/achievable/relevant`), `target_date`, `status`, `priority`. Отсутствует поле для исходного «сырого» текста цели от пользователя до разложения по SMART (raw input). | Низкий. Без raw-поля при перегенерации clarify теряется первоначальная формулировка пользователя; UI не сможет показать «как было введено изначально». | Добавить `goal.raw_input text` (или хранить в `ai_session.input` первой clarify-сессии). Подтвердить переход `draft→clarifying` на уровне приложения; БД-инвариантов на это нет — допустимо для MVP. |
| **Получить AI clarify** | `ai_session` (type=clarify), `ai_message`, `goal` | Структурно покрыто: `ai_session.input/output`, `ai_message(role, content, seq)`. Нет явного поля «финальный набор уточнённых SMART-значений, предложенных AI» отдельно от `output` (он свободный JSONB). | Средний. `ai_session_insert_own` требует `status='pending' AND output IS NULL` — клиент создаёт сессию, но **не может дописать ответы ассистента** (`ai_message` INSERT разрешён только `role='user'`). Значит весь write-path clarify (вопросы ассистента + запись output) обязан идти через Edge Function/service_role. Если фронт попытается напрямую — RLS отклонит. | Зафиксировать в API-контракте: clarify полностью оркеструется Edge Function. Применение уточнённых SMART-значений к `goal` (`UPDATE`) делает либо пользователь (политика `goal_update_own` разрешает), либо Edge Function. Решить, кто пишет результат clarify в `goal`. |
| **Сохранить AI plan** | `ai_session` (type=plan), `task`, `goal`, опц. `milestone` | Покрыто: `task.generated_by_session_id`, `task.source`, `order_index`, `due_date`, `estimated_effort`. Нет поля версии плана / счётчика регенераций на `goal` или `ai_session`. | Средний. Перегенерация плана: схема позволяет диффинг (`source='ai'` + `generated_by_session_id`), но **сама логика «удалить старые ai-задачи, сохранить manual»** не выражена в БД — это ответственность Edge Function. `task` INSERT под service_role обходит RLS, `user_id` Edge Function проставляет сама. Риск рассинхрона `goal.progress_pct` после массовой вставки задач. | Реализовать перегенерацию транзакционно в Edge Function: пометить/удалить прежние `source='ai'` задачи предыдущей сессии, вставить новые, пересчитать `progress_pct`. Опц. добавить `goal.plan_version smallint` для трассировки. |
| **Отметить задачу (выполнено)** | `task`, `completion`, опц. `progress_event` | Покрыто: `task.status`, `task.completed_at`, `completion(task_id, goal_id, user_id, completed_at)`. | Средний. Двойной источник истины: статус живёт и в `task.status='done'`, и в `completion`. Нет триггера/гарантии их согласованности и пересчёта `goal.progress_pct`. `completion_insert_own` проверяет владение задачей (EXISTS) — хорошо, но не проверяет, что `goal_id` в `completion` совпадает с `task.goal_id` (можно подставить чужой/несвязанный свой goal_id). | Выбрать единый паттерн: либо `completion` — производная от смены `task.status` (пишется триггером), либо `task.status` обновляется из `completion`. Добавить в `completion_insert_own` проверку `goal_id = (select t.goal_id from task t where t.id = task_id)`. Триггер `AFTER` на `task`/`completion` пересчитывает `goal.progress_pct` и пишет `progress_event`. |
| **Построить dashboard** | `goal`, `task`, опц. `progress_event`, `completion` | Покрыто индексами: `idx_goal_user_status`, `idx_task_goal_order`, `idx_task_user_status`, частичный `idx_task_due ... where status<>'done'`. `goal.progress_pct` — кеш для прогресс-баров. | Низкий. Основной риск — устаревший `goal.progress_pct`, если пересчёт не привязан к смене статуса задач (см. предыдущий сценарий). «Задачи на сегодня» обслуживаются частичным индексом по `due_date`. | Гарантировать пересчёт `progress_pct` триггером при любой смене `task.status`. Для агрегатов дашборда (счётчики done/total) опереться на запросы по `idx_task_user_status`, а не на денормализованные счётчики. |
| **Получить weekly review** | `weekly_review`, `ai_session` (type=review), `progress_event` (источник метрик), `goal`, `task`, `user_preferences` (review_weekday) | Покрыто: `weekly_review(period_start/end, summary, insights, recommendations, metrics_snapshot)`, `uq_weekly_review_session` (1:1 с сессией), `review_weekday` в prefs для cron. | Средний. `ai_session.goal_id` nullable + инвариант `chk_ai_session_goal_required` (review без goal допустим) — review покрывает все цели разом, что соответствует MVP. Но: точные недельные метрики зависят от `progress_event`, который помечен **опциональным**; без него `metrics_snapshot` строится из текущего состояния `task` и «плывёт» относительно реального хода недели. `recommendations` JSONB содержит `applied`-флаг и `goal_id/task_id`, но связь «применить рекомендацию → создать/изменить task» не выражена схемой. | Для корректного weekly review сделать `progress_event` **обязательным** (не опциональным) — иначе метрики недели неточны. Определить, как `recommendations[].applied` материализуется в изменения `task` (Edge Function под service_role). `weekly_review` пишет только service_role (RLS-write для authenticated отсутствует) — согласовано. |

## Сводка по покрытию MVP

**Схема поддерживает все шесть сценариев** — таблицы, ключи, индексы и RLS присутствуют. Критичных блокеров нет, но есть сквозные зоны риска, которые надо закрыть до реализации:

1. **Согласованность прогресса (сквозной риск №1).** `goal.progress_pct` — денормализованный кеш, но в схеме нет триггера его пересчёта. Затрагивает «отметить задачу», «dashboard», «weekly review». Без `AFTER`-триггера на `task` (и/или `completion`) дашборд и метрики будут показывать устаревшие данные. **Это главная рекомендация шага 4.**

2. **Двойной источник истины `task.status` ↔ `completion`.** Нужно явно определить направление синхронизации, иначе «выполнено» в дашборде и в логе completions могут разойтись.

3. **`progress_event` не должен быть опциональным для weekly review.** Если недельные метрики обязаны быть точными исторически, append-only лог становится обязательной зависимостью сценария review, а не «опциональным» компонентом.

4. **Раздельные нехватающие поля (не блокеры):** `goal.raw_input` (исходная формулировка до SMART), опц. `goal.plan_version` (трассировка регенераций), уточнение проверки `completion.goal_id` против `task.goal_id`.

5. **Write-path всех AI-сценариев целиком лежит на Edge Functions / service_role** (clarify-output, plan-tasks, weekly_review, progress_event). Это следует из RLS шага 3 и должно быть явно зафиксировано в API-контракте — фронт не пишет эти данные напрямую.
````

**Результат шага:** Агент прогнал сценарии MVP (создать цель, AI clarify, сохранить plan, отметить задачу, дашборд, weekly review) в таблице scenario / required tables / missing fields / risk / recommendation и зафиксировал ключевой вывод: AI-управляемые поля (ai output, сгенерированный план, weekly review) должен записывать только сервер через Edge Function, а не фронтенд. Это закреплено архитектурным правилом проекта «OpenRouter только на серверной стороне».

## Шаг 5. Финализировать ADR

**Промпт (подан агенту дословно):**

```text
Role:
Ты architect, который оформляет решение для репозитория.

Task:
Собери итоговое решение по схеме данных в ADR.

Context:
Нужно объяснить, почему выбран Supabase, PostgreSQL, RLS и Edge Functions.

Format:
Markdown ADR: Context, Decision, Consequences, Alternatives, Verification.
```

**Сырой ответ агента (дословно, без редактирования):**

````text
Этот шаг — оформление архитектурного решения по схеме данных в ADR. Здесь не нужны запуски кода или поиск по файлам: вход уже содержит результаты шагов 1–4, и от меня требуется собрать их в единый документ заданного формата. Выдаю ADR.

# ADR-0003: Схема данных и платформа хранения FocusTrack AI (Supabase + PostgreSQL + RLS + Edge Functions)

- **Статус:** Accepted
- **Дата:** 2026-06-17
- **Контекст ДЗ/фаза:** Проектирование схемы данных MVP (Chain-of-Thought, шаги 1–5)
- **Связанные решения:** выбор backend-стека (Supabase Cloud, см. CLAUDE.md «Текущее состояние FocusTrack AI»)

## Context

FocusTrack AI — планировщик личных и рабочих целей с AI-планированием. MVP охватывает шесть сквозных сценариев: SMART-ввод цели, AI-уточнение (`clarify`), генерация AI-плана (`plan`), дашборд прогресса, отметка выполнения задач и Weekly AI Review (`review`).

Из этих сценариев и предыдущих шагов цепочки вытекают жёсткие требования к хранилищу:

1. **Строгая мультитенантная изоляция.** Каждый пользователь видит и меняет только свои данные. Это не «фича», а инвариант безопасности: единая `auth.users`, десятки тысяч строк целей/задач/событий на одном инстансе, утечка между тенантами недопустима.
2. **AI-операции с серверной стороны.** Вызовы OpenRouter (clarify/plan/review) должны выполняться только сервером — ключ модели нельзя отдавать на клиент. Нужен управляемый serverless-слой рядом с БД.
3. **Аудит и идемпотентность AI.** Нужно логировать каждый вызов модели (модель, версия промпта, токены, стоимость), защищаться от двойного запуска (ретраи, двойной клик) и уметь перегенерировать план, не затирая ручные правки пользователя.
4. **Смешанная структура данных.** Часть данных строго типизирована (SMART-критерии, статусы, даты, прогресс) — нужны валидация, индексы, фильтрация. Часть нестабильна по форме (вход/выход модели, инсайты, рекомендации, рабочие часы) — формат диктуется промптом и будет меняться без миграций.
5. **Периодические задачи.** Weekly Review запускается по расписанию в зависимости от `review_weekday` и таймзоны пользователя — нужен cron/scheduler.
6. **Скорость поставки MVP (учебный трек, малая команда).** Минимум инфраструктурного кода: managed auth, managed Postgres, готовый авто-API, встроенные миграции.

Альтернатива «писать всё руками» (отдельный API-слой, своя авторизация, ручная изоляция тенантов в коде приложения) переносит критичный для безопасности инвариант изоляции в прикладной код, где его легко нарушить одним забытым `WHERE user_id = ?`. Для продукта с персональными целями и AI-перепиской это неприемлемый класс риска.

## Decision

Принимаем **Supabase Cloud** как единую платформу backend со следующими компонентами и архитектурными решениями.

### 1. PostgreSQL как единственное хранилище

Реляционная модель естественно ложится на доменный граф из шага 1: `user → goal → task`, `goal → ai_session → {ai_message | task | weekly_review}`. Внешние ключи и каскады дают целостность и GDPR-удаление подграфа пользователя одним действием. Реализация схемы — в шаге 2 (таблицы `profiles`, `user_preferences`, `goal`, `ai_session`, `ai_message`, `milestone`, `task`, `completion`, `weekly_review`, `progress_event`).

Ключевые решения по схеме:

- **Профиль вынесен в `public.profiles`** (`PK = auth.users.id`, `on delete cascade`), а не в слабо типизированные metadata `auth.users` — ради JOIN/RLS и типизации.
- **`user_id` денормализован во все дочерние таблицы** (`task`, `ai_message`, `milestone`, `completion`, `progress_event`). Осознанный размен: RLS-политики становятся однородными `user_id = auth.uid()` без JOIN/подзапросов, что критично для производительности RLS в Supabase. Цена — следить за консистентностью `user_id` при вставке (обеспечивают Edge Functions).
- **`ai_session` — одна полиморфная таблица** для `clarify/plan/review`: единый аудит, единый учёт токенов/стоимости OpenRouter, единая статусная машина и идемпотентность. Различия типов выражены nullable-связями и CHECK-инвариантом `chk_ai_session_goal_required` (clarify/plan требуют `goal_id`, review — нет).
- **Гибрид «колонки + JSONB».** Структурное (SMART-критерии, статусы, даты, прогресс) — обычные колонки с `CHECK` (валидация, индексы, фильтрация). Нестабильное (`ai_session.input/output/token_usage`, `weekly_review.insights/recommendations/metrics_snapshot`, `user_preferences.work_hours`) — JSONB, чтобы менять формат без миграций.
- **Статусы через `CHECK ... in (...)`, а не PG ENUM** — `ALTER TYPE ADD VALUE` неудобен в миграциях (вне транзакции, без удаления значений), CHECK правится обычным `ALTER TABLE` и читаемее в дашборде.
- **Идемпотентность и перегенерация плана.** `ai_session.idempotency_key` + частичный уникальный индекс `(user_id, idempotency_key)` против двойного запуска; `task.source` + `task.generated_by_session_id` (с `on delete set null`) дают диффинг при перегенерации — трогаются только `source='ai'`-задачи, ручные сохраняются.

### 2. Row Level Security как граница изоляции тенантов

Изоляция реализована в **базе данных**, а не в прикладном коде. RLS включён на всех прикладных таблицах; политики (шаг 3) **гранулярны по операциям** (`SELECT`/`INSERT`/`UPDATE`/`DELETE`), а не одной `FOR ALL`-строкой, потому что у чтения и записи разные классы рисков:

- Базовое правило — `user_id = (select auth.uid())` и на чтение, и на запись; `to authenticated` отрезает анонимную роль полностью.
- **Anti-reassignment**: на UPDATE предикат стоит и в `USING`, и в `WITH CHECK` — нельзя сменить `user_id` и «увести»/«подарить» строку.
- **Разделение клиент / service_role**: AI-управляемые данные (`ai_session.output/token_usage`, `weekly_review`, `progress_event`) клиенту писать запрещено (политики INSERT/UPDATE/DELETE для `authenticated` отсутствуют → запрет по умолчанию). `ai_session_insert_own` дополнительно требует `status='pending' AND output IS NULL AND token_usage IS NULL`; `ai_message` INSERT разрешён только `role='user'`; `completion_insert_own` проверяет владение задачей через `EXISTS`.
- **`(select auth.uid())`** вместо `auth.uid()` — вычисляется как `InitPlan` один раз на запрос, а не построчно (рекомендация Supabase, заметно на больших выборках).

### 3. Edge Functions как серверный AI-слой (service_role)

Весь write-path AI-сценариев (clarify-оркестрация и запись output, генерация plan-задач, формирование `weekly_review`, запись `progress_event`) выполняют Supabase Edge Functions под **service_role-ключом, который обходит RLS by design**. Это даёт:

- единственное место, где живёт ключ OpenRouter (никогда не на клиенте);
- транзакционную перегенерацию плана (удалить прежние `source='ai'`-задачи, вставить новые, пересчитать прогресс);
- корректное проставление `user_id` самой функцией (RLS его уже не проверит → ответственность на Edge Function);
- единую точку учёта токенов/стоимости.

service_role-ключ существует только в серверном окружении Edge Functions.

### 4. Supabase Auth + авто-API

`auth.users` — корень владения и источник `auth.uid()` для RLS. Авто-генерируемый REST/Realtime API поверх таблиц снимает необходимость в собственном CRUD-слое: клиент ходит под `authenticated`-ролью, RLS гарантирует изоляцию. Periodic Weekly Review запускается планировщиком Supabase (cron) с учётом `user_preferences.review_weekday`.

## Consequences

**Положительные:**

- **Изоляция тенантов — в БД, а не в коде.** Забыть `WHERE user_id` в одном из эндпоинтов невозможно: RLS закрывает доступ на уровне строк независимо от прикладной логики. Это снимает целый класс OWASP-багов (broken object-level authorization).
- **Минимум инфраструктурного кода.** Managed Postgres + Auth + авто-API + Edge Functions + cron + миграции «из коробки» — команда фокусируется на доменной логике и промптах, а не на платформе. Соответствует темпу учебного трека и MVP.
- **Полный аудит и контроль расходов на AI** через единую `ai_session` (модель, версия промпта, токены, стоимость), идемпотентность через уникальный ключ.
- **Эволюция без миграций там, где формат нестабилен** (JSONB-поля), и строгая валидация там, где он стабилен (колонки + CHECK).
- **GDPR-friendly удаление**: каскады от `auth.users` вниз вычищают весь подграф пользователя одним действием.

**Отрицательные / издержки:**

- **service_role-ключ — критичный секрет.** Его утечка обходит всю RLS-модель. Требуется строгое разделение окружений и запрет попадания ключа на клиент. Edge Function обязана сама корректно ставить `user_id` — ошибка здесь не ловится RLS.
- **Денормализация `user_id` требует дисциплины.** Консистентность `user_id` ↔ `goal_id` ↔ `task_id` не гарантируется схемой автоматически (см. риск `completion.goal_id` vs `task.goal_id` из шага 4) — нужны проверки в политиках/триггерах.
- **Согласованность производного состояния — на нас.** `goal.progress_pct` — денормализованный кеш; в схеме шага 2 нет триггера пересчёта. Без `AFTER`-триггера на `task`/`completion` дашборд и метрики review будут показывать устаревшие данные. **Это главный технический долг, который надо закрыть до реализации** (шаг 4, сквозной риск №1).
- **Двойной источник истины `task.status` ↔ `completion`** требует явно выбранного направления синхронизации, иначе расхождение «выполнено» в дашборде и в логе.
- **Точность недельных метрик зависит от `progress_event`.** Если метрики обязаны быть исторически точными, append-only лог перестаёт быть «опциональным» и становится обязательной зависимостью сценария review.
- **Vendor lock-in на Supabase.** RLS-политики, Edge Functions и Auth-интеграция привязывают к платформе; миграция на «голый» Postgres потребует переноса auth и переписывания серверного слоя.

**Follow-up (выносится в реализацию/следующие ADR):**

1. `AFTER`-триггер пересчёта `goal.progress_pct` при смене `task.status`/`completion` (приоритет №1).
2. Выбор направления синхронизации `task.status` ↔ `completion`; добавить в `completion_insert_own` проверку `goal_id = (select t.goal_id from task t where t.id = task_id)`.
3. Решить статус `progress_event`: сделать обязательным для точного review.
4. Недостающие поля (не блокеры): `goal.raw_input` (исходная формулировка до SMART), опц. `goal.plan_version`.
5. Column-level защита AI-управляемых полей (`task.source`, `generated_by_session_id`, `goal.progress_pct`) через `BEFORE UPDATE`-триггер — выходит за рамки строковой RLS.
6. Зафиксировать в API-контракте: фронт **не** пишет AI-данные напрямую — весь AI write-path только через Edge Functions.

## Alternatives

| Альтернатива | Почему рассмотрена | Почему отклонена |
|---|---|---|
| **Своё backend-приложение (Node/Go) + managed Postgres (RDS/Cloud SQL)** | Полный контроль, нет vendor lock-in. | Изоляцию тенантов пришлось бы держать в прикладном коде (риск забытого `WHERE user_id`), плюс свой auth, свой API, свой деплой serverless для AI. Слишком много инфраструктуры для MVP/учебного темпа. |
| **Firebase / Firestore (NoSQL) + Cloud Functions** | Managed, быстрый старт, встроенные security rules. | Доменная модель сильно реляционна (граф goal→task→session→review, агрегации для дашборда/метрик). На документной БД джойны и недельные агрегаты неудобны; security rules слабее SQL-уровневой RLS для сложных инвариантов. |
| **PostgreSQL ENUM-типы для статусов** | Нативная типобезопасность статусов. | `ALTER TYPE ADD VALUE` неудобен в миграциях (вне транзакции, без удаления значений). Выбран `CHECK ... in (...)` — правится обычным `ALTER TABLE`, читаем в дашборде. |
| **Три отдельные таблицы вместо полиморфного `ai_session`** | Чище типизация под каждый тип AI-вызова. | Разносит аудит, учёт токенов и статусную машину по трём местам, усложняет биллинг OpenRouter и RLS. Полиморфная таблица + CHECK-инвариант проще для MVP. |
| **Изоляция тенантов только в коде приложения (без RLS)** | Меньше «магии» в БД, проще локально отлаживать. | Переносит критичный инвариант безопасности в прикладной слой, где одна ошибка = кросс-тенантная утечка. RLS делает изоляцию обязательной на уровне строк независимо от кода. |
| **Единая `FOR ALL` RLS-политика на таблицу** (как в шаге 2) | Меньше политик, проще читать. | Не различает риски SELECT и INSERT/UPDATE, не закрывает anti-reassignment и фабрикацию AI-результатов. Заменено гранулярными политиками по операциям (шаг 3). |
| **AI-вызовы OpenRouter с клиента** | Меньше серверного кода. | Раскрывает ключ модели и снимает контроль расходов/аудита. Несовместимо с требованием «OpenRouter только с серверной стороны». |

## Verification

Решение считается корректно реализованным, если выполняются проверки ниже.

**Изоляция тенантов (RLS):**
- Под двумя разными `authenticated`-пользователями: `select` по `goal/task/ai_session/weekly_review/...` возвращает только собственные строки; чужие `id` дают 0 строк.
- `update`/`delete` чужой строки (по известному `id`) → 0 затронутых строк (USING-предикат).
- Попытка `insert`/`update` своей строки с чужим `user_id` → отклонено `WITH CHECK` (anti-reassignment).
- Под ролью `anon` (только публичный ключ, без логина) любые прикладные таблицы недоступны.
- `\d+` / `pg_policies`: на каждой прикладной таблице RLS включён и присутствуют ожидаемые гранулярные политики.

**Ограничения write-path AI:**
- `authenticated` не может вставить `ai_session` с `output`/`token_usage` или `status<>'pending'` → отклонено.
- `authenticated` не может вставить `ai_message` с `role IN ('assistant','system')` → отклонено.
- `authenticated` не имеет INSERT/UPDATE/DELETE на `weekly_review` и `progress_event` → отклонено (запрет по умолчанию).
- `completion` нельзя поставить на чужой `task_id` → отклонено `EXISTS`-проверкой.

**Идемпотентность и схема:**
- Повторный `insert` `ai_session` с тем же `(user_id, idempotency_key)` → нарушение уникального индекса.
- Нарушение `chk_ai_session_goal_required` (clarify/plan без `goal_id`) → отклонено.
- Перегенерация плана через Edge Function удаляет только `source='ai'`-задачи прежней сессии, `source='manual'` и ручные правки сохраняются.

**Сценарное покрытие (шаг 4):** прогон шести MVP-сценариев (создать цель, clarify, plan, отметить задачу, dashboard, weekly review) на тестовых данных — каждый завершается ожидаемым состоянием БД.

**Согласованность производного состояния (после внедрения follow-up №1):** при смене `task.status` на `done`/обратно `goal.progress_pct` пересчитывается триггером и совпадает с прямой агрегацией `count(done)/count(*)` по задачам цели.

**Серверный AI:** ключ OpenRouter отсутствует в клиентском бандле и переменных фронта; присутствует только в окружении Edge Functions. service_role-ключ не встречается в клиентском коде.

**CI/миграции:** SQL шагов 2–3 применяется чистой миграцией на пустой БД без ошибок; повторный прогон идемпотентен (`if not exists`, `drop policy if exists`).
````

**Результат шага:** Агент собрал итоговый ADR (Accepted, 2026-06-17) по схеме данных и платформе: Supabase + PostgreSQL + RLS + Edge Functions, с разделами Context / Decision / Consequences / Alternatives / Verification. Решение согласуется с принятым стеком проекта, зафиксированным в `docs/architecture/adr/001-tech-stack.md`.

## Итог методологии

Цепочка выполнена и зафиксирована по шагам: агент сначала закрепил домен, затем спроектировал SQL, затем безопасность (RLS), затем проверку сценариев и только после этого оформил решение в ADR. Такой процесс снижает риск получить красивую, но непроверенную схему, и делает каждый шаг отдельно верифицируемым. Финальная принятая схема и политики реализованы в `supabase/migrations/`, а решение по стеку — в `docs/architecture/adr/001-tech-stack.md`.
