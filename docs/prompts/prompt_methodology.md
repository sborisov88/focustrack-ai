# Методология сложного запроса

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

| Параметр         | Значение                                                                           |
| ---------------- | ---------------------------------------------------------------------------------- |
| Агент            | Codex CLI (`@openai/codex` 0.139.0), модель `gpt-5.5`                              |
| Команда          | `codex exec --skip-git-repo-check --ephemeral -s read-only`                        |
| Дата прогона     | 2026-06-17                                                                         |
| Тип              | 5 последовательных шагов; дословный вывод каждого шага подаётся на вход следующего |
| Контекст шага    | Краткий контекст продукта + промпт шага + выводы предыдущих шагов                  |
| Обработка вывода | Финальный ответ Codex по каждому шагу приведён дословно, без редактирования        |

Chain-of-Thought здесь — не скрытое внутреннее рассуждение модели, а явная пошаговая декомпозиция: каждый шаг получает отдельный промпт, входной контекст и проверяемый результат. Ниже для каждого шага зафиксированы три блока: **Промпт → Сырой ответ агента → Результат шага**.

## Этап 1. Уточнить домен

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

```text
| entity | purpose | key fields | relations | open questions |
|---|---|---|---|---|
| `users` / `profiles` | Пользовательский контекст поверх Supabase Auth | `id`, `email`, `timezone`, `locale`, `weekly_review_day`, `created_at` | `profiles.id` = `auth.users.id`; 1 пользователь → много целей, ИИ-сессий, обзоров | Нужен ли отдельный профиль в MVP или достаточно `auth.users` + настройки позже? |
| `goals` | Главная доменная сущность: личная или рабочая SMART-цель | `id`, `user_id`, `title`, `description`, `category`, `smart_specific`, `smart_measurable`, `smart_achievable`, `smart_relevant`, `target_date`, `status`, `created_at`, `updated_at` | Пользователь 1:N цели; цель 1:N уточнения, планы, задачи, прогресс, обзоры | Хранить SMART-поля строго структурно или часть оставить в свободном тексте? |
| `ai_sessions` | Единый журнал ИИ-взаимодействий: `clarify`, `plan`, `review` | `id`, `user_id`, `goal_id`, `type`, `status`, `input_snapshot`, `output`, `model`, `token_usage`, `error`, `created_at` | Принадлежит пользователю; может быть связана с целью; порождает уточнение, план или недельный обзор | Делать одну универсальную таблицу или отдельные таблицы под каждый тип ИИ-операции? |
| `goal_clarifications` | Результат ИИ-уточнения цели перед планированием | `id`, `goal_id`, `ai_session_id`, `questions`, `answers`, `missing_smart_fields`, `refined_goal_text`, `created_at` | Цель 1:N уточнения; уточнение связано с ИИ-сессией `clarify` | Разрешать несколько раундов уточнения или в MVP один активный раунд на цель? |
| `plans` | Сгенерированный ИИ-план достижения цели | `id`, `goal_id`, `ai_session_id`, `version`, `summary`, `start_date`, `end_date`, `status`, `created_at` | Цель 1:N версии планов; план 1:N шаги/задачи | Нужна ли версионность планов в MVP или только последний активный план? |
| `plan_items` | Конкретные шаги, задачи, этапы или привычки внутри плана | `id`, `plan_id`, `goal_id`, `title`, `description`, `item_type`, `due_date`, `priority`, `order_index`, `status`, `estimated_effort` | План 1:N элементы; элемент может иметь прогресс-обновления | Разделять задачи, этапы и привычки на разные сущности или оставить `item_type`? |
| `progress_entries` | Пользовательские отметки прогресса для дашборда | `id`, `user_id`, `goal_id`, `plan_item_id`, `value`, `unit`, `note`, `mood`, `confidence`, `recorded_at` | Пользователь 1:N записи; цель 1:N прогресс; опционально связано с задачей плана | Достаточно ручных отметок или нужны автоматические расчёты выполнения по задачам? |
| `goal_metrics` | Измеримые показатели цели для SMART и графиков | `id`, `goal_id`, `name`, `unit`, `target_value`, `current_value`, `baseline_value`, `direction` | Цель 1:N метрики; прогресс может обновлять метрики | В MVP нужна отдельная таблица метрик или хватит полей в `goals`? |
| `weekly_reviews` | Недельный ИИ-обзор прогресса и рекомендации | `id`, `user_id`, `goal_id`, `ai_session_id`, `week_start`, `week_end`, `progress_summary`, `risks`, `recommendations`, `next_focus`, `created_at` | Пользователь 1:N обзоры; цель 1:N обзоры; связан с ИИ-сессией `review` | Обзор должен быть по каждой цели отдельно или общий по всем активным целям пользователя? |
| `dashboard_snapshots` | Кэш агрегатов для дашборда прогресса | `id`, `user_id`, `goal_id`, `completion_percent`, `streak_days`, `last_activity_at`, `risk_level`, `updated_at` | Производная сущность от целей, задач и прогресса | Нужен ли физический кэш в MVP или считать дашборд запросами/представлением? |
| `ai_prompt_templates` | Управляемые серверные шаблоны промптов для Edge Functions | `id`, `type`, `version`, `system_prompt`, `schema`, `is_active`, `created_at` | Используется ИИ-сессиями; не принадлежит пользователю | Хранить шаблоны в БД для версионности или в коде Edge Functions для простоты MVP? |
```

**Результат шага:** Codex выделил доменные сущности MVP — `users`/`profiles`, `goals`, `ai_sessions`, отметки выполнения, `weekly_review`, плюс служебную `ai_prompt_templates` — связи через `user_id` и набор open questions. Базовый состав совпадает с принятой схемой (`supabase/migrations/20260617024511_init_focustrack_schema.sql`).

## Этап 2. Спроектировать таблицы

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
**SQL draft**

```sql
begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  weekly_review_day smallint not null default 1 check (weekly_review_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_prompt_templates (
  id bigint generated always as identity primary key,
  type text not null check (type in ('clarify', 'plan', 'review')),
  version integer not null check (version > 0),
  system_prompt text not null,
  response_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (type, version)
);

create unique index ai_prompt_templates_one_active_idx
  on public.ai_prompt_templates(type)
  where is_active;

create table public.goals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  smart_specific text,
  smart_measurable text,
  smart_achievable text,
  smart_relevant text,
  target_date date,
  status text not null default 'draft'
    check (status in ('draft', 'clarifying', 'active', 'paused', 'completed', 'archived', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.ai_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id bigint,
  prompt_template_id bigint references public.ai_prompt_templates(id) on delete set null,
  type text not null check (type in ('clarify', 'plan', 'review')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  output jsonb,
  model text,
  token_usage jsonb not null default '{}'::jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_sessions_goal_fk
    foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  constraint ai_sessions_goal_required_for_goal_ops
    check (type = 'review' or goal_id is not null),
  unique (id, user_id)
);

create table public.goal_clarifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id bigint not null,
  ai_session_id bigint not null,
  round_no integer not null default 1 check (round_no > 0),
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  missing_smart_fields text[] not null default '{}',
  refined_goal_text text,
  status text not null default 'open' check (status in ('open', 'answered', 'applied', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  foreign key (ai_session_id, user_id) references public.ai_sessions(id, user_id) on delete cascade,
  unique (goal_id, round_no)
);

create table public.plans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id bigint not null,
  ai_session_id bigint not null,
  version integer not null check (version > 0),
  summary text,
  start_date date,
  end_date date,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'superseded', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  foreign key (ai_session_id, user_id) references public.ai_sessions(id, user_id) on delete cascade,
  unique (id, user_id),
  unique (id, goal_id, user_id),
  unique (goal_id, version)
);

create unique index plans_one_active_per_goal_idx
  on public.plans(goal_id)
  where status = 'active';

create table public.plan_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id bigint not null,
  goal_id bigint not null,
  title text not null,
  description text,
  item_type text not null default 'task' check (item_type in ('task', 'milestone', 'habit')),
  due_date date,
  priority smallint check (priority between 1 and 5),
  order_index integer not null default 0,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'skipped', 'cancelled')),
  estimated_effort_minutes integer check (estimated_effort_minutes is null or estimated_effort_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plan_id, goal_id, user_id) references public.plans(id, goal_id, user_id) on delete cascade,
  unique (id, user_id),
  unique (id, goal_id, user_id)
);

create table public.goal_metrics (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id bigint not null,
  name text not null,
  unit text,
  baseline_value numeric,
  current_value numeric,
  target_value numeric,
  direction text not null default 'increase' check (direction in ('increase', 'decrease', 'maintain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  unique (id, user_id),
  unique (id, goal_id, user_id)
);

create table public.progress_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id bigint not null,
  plan_item_id bigint,
  goal_metric_id bigint,
  value numeric,
  unit text,
  note text,
  mood smallint check (mood between 1 and 5),
  confidence smallint check (confidence between 1 and 5),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  foreign key (plan_item_id, goal_id, user_id) references public.plan_items(id, goal_id, user_id) on delete cascade,
  foreign key (goal_metric_id, goal_id, user_id) references public.goal_metrics(id, goal_id, user_id) on delete cascade
);

create table public.weekly_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id bigint,
  ai_session_id bigint not null,
  scope text not null default 'goal' check (scope in ('goal', 'user')),
  week_start date not null,
  week_end date not null,
  progress_summary text,
  risks jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  next_focus jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  foreign key (ai_session_id, user_id) references public.ai_sessions(id, user_id) on delete cascade,
  check (week_end >= week_start),
  check ((scope = 'user' and goal_id is null) or (scope = 'goal' and goal_id is not null))
);

create unique index weekly_reviews_goal_week_idx
  on public.weekly_reviews(user_id, goal_id, week_start)
  where goal_id is not null;

create unique index weekly_reviews_user_week_idx
  on public.weekly_reviews(user_id, week_start)
  where goal_id is null;

create table public.dashboard_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id bigint not null,
  completion_percent numeric(5,2) not null default 0 check (completion_percent between 0 and 100),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_activity_at timestamptz,
  risk_level text not null default 'unknown' check (risk_level in ('low', 'medium', 'high', 'unknown')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  unique (user_id, goal_id)
);

create index goals_user_status_idx on public.goals(user_id, status, target_date);
create index ai_sessions_user_created_idx on public.ai_sessions(user_id, created_at desc);
create index ai_sessions_goal_created_idx on public.ai_sessions(goal_id, created_at desc) where goal_id is not null;
create index goal_clarifications_goal_idx on public.goal_clarifications(goal_id, created_at desc);
create index plans_goal_version_idx on public.plans(goal_id, version desc);
create index plan_items_plan_order_idx on public.plan_items(plan_id, order_index);
create index plan_items_goal_status_due_idx on public.plan_items(goal_id, status, due_date);
create index goal_metrics_goal_idx on public.goal_metrics(goal_id);
create index progress_entries_goal_recorded_idx on public.progress_entries(goal_id, recorded_at desc);
create index progress_entries_plan_item_idx on public.progress_entries(plan_item_id) where plan_item_id is not null;
create index weekly_reviews_user_created_idx on public.weekly_reviews(user_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger ai_sessions_set_updated_at before update on public.ai_sessions
  for each row execute function public.set_updated_at();
create trigger goal_clarifications_set_updated_at before update on public.goal_clarifications
  for each row execute function public.set_updated_at();
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
create trigger plan_items_set_updated_at before update on public.plan_items
  for each row execute function public.set_updated_at();
create trigger goal_metrics_set_updated_at before update on public.goal_metrics
  for each row execute function public.set_updated_at();
create trigger progress_entries_set_updated_at before update on public.progress_entries
  for each row execute function public.set_updated_at();
create trigger weekly_reviews_set_updated_at before update on public.weekly_reviews
  for each row execute function public.set_updated_at();
create trigger dashboard_snapshots_set_updated_at before update on public.dashboard_snapshots
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.goal_clarifications enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.goal_metrics enable row level security;
alter table public.progress_entries enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.dashboard_snapshots enable row level security;
alter table public.ai_prompt_templates enable row level security;

create policy profiles_owner_all on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy goals_owner_all on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy goal_metrics_owner_all on public.goal_metrics
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy progress_entries_owner_all on public.progress_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ai_sessions_owner_select on public.ai_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy goal_clarifications_owner_select on public.goal_clarifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy plans_owner_select on public.plans
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy plan_items_owner_select on public.plan_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy plan_items_owner_update on public.plan_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy weekly_reviews_owner_select on public.weekly_reviews
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy dashboard_snapshots_owner_select on public.dashboard_snapshots
  for select to authenticated
  using ((select auth.uid()) = user_id);

commit;
```

**Комментарии к решениям**

`profiles` отделён от `auth.users`, потому что настройки продукта не стоит хранить в системной схеме Auth. `profiles.id` совпадает с `auth.users.id`.

Во всех пользовательских таблицах есть `user_id`. Это намеренная денормализация: RLS-политики становятся простыми и быстрыми, без соединений через `goals`.

Для доменных сущностей использован `bigint generated always as identity`, а не случайный UUID. В Supabase это нормально для внутренней многопользовательской БД, потому что доступ всё равно ограничен RLS.

Связи вида `(goal_id, user_id)` и `(plan_item_id, goal_id, user_id)` защищают от подстановки чужих идентификаторов: строка не сможет ссылаться на сущность другого пользователя.

`ai_sessions` — единый журнал для `clarify`, `plan`, `review`. `input_snapshot`, `output`, `token_usage`, `error` хранятся как `jsonb`, потому что формат ответов AI будет меняться быстрее, чем стабильная доменная модель.

`plans` версионируются через `version`; активный план на цель ограничен частичным уникальным индексом `plans_one_active_per_goal_idx`.

`weekly_reviews.goal_id` nullable: `scope = 'goal'` означает обзор одной цели, `scope = 'user'` — общий недельный обзор по активным целям пользователя.

`dashboard_snapshots` вынесен как физический кэш. Для совсем раннего MVP его можно заменить представлением или запросами, но таблица полезна, если дашборд должен открываться быстро.

`ai_prompt_templates` не имеет пользовательских RLS-политик. Читать и менять шаблоны должны только серверные Edge Functions через `service_role`.

Для AI-сгенерированных таблиц (`ai_sessions`, `goal_clarifications`, `plans`, `weekly_reviews`, `dashboard_snapshots`) клиенту дан только `select`. Запись должна идти через Edge Functions, чтобы пользователь не мог подделать AI-результат.

`plan_items` разрешены на `select` и `update`, чтобы пользователь мог отмечать задачи выполненными. Если в MVP нужен ручной ввод задач, позже можно добавить `insert/delete` политики.

Статусы сделаны через `text + check`, а не PostgreSQL enum: для MVP это проще менять миграциями.

Индексы поставлены на `user_id`, внешние ключи, статусы и даты, потому что основные экраны будут фильтровать цели, задачи, прогресс и обзоры по пользователю и времени.
````

**Результат шага:** Codex предложил расширённый SQL-черновик с таблицами во множественном числе (`goals`, `ai_sessions`, `weekly_reviews`), но смоделировал задачи как `plans`/`plan_items`, отметки выполнения — как `progress_entries`, плюс дополнительные `goal_clarifications`, `goal_metrics`, `dashboard_snapshots`, `ai_prompt_templates`. В принятой миграции состав консолидирован под MVP: задачи — таблица `tasks`, отметки — `task_completions`, AI-лог — `ai_sessions` с JSONB `input`/`output`; добавлены enum-статусы и индексы. Часть предложенного Codex (`plan_items`, `goal_metrics`, `dashboard_snapshots`, `ai_prompt_templates`) упрощена/отложена как post-MVP. Расхождение между прогоном и принятой схемой оставлено намеренно — это и есть свидетельство реального, а не реконструированного выполнения.

## Этап 3. Добавить RLS

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
```sql
begin;

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.goal_metrics enable row level security;
alter table public.plan_items enable row level security;       -- tasks
alter table public.progress_entries enable row level security; -- completions
alter table public.ai_sessions enable row level security;
alter table public.goal_clarifications enable row level security;
alter table public.plans enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.dashboard_snapshots enable row level security;
alter table public.ai_prompt_templates enable row level security;

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all
on public.profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists goals_owner_all on public.goals;
create policy goals_owner_all
on public.goals
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists goal_metrics_owner_all on public.goal_metrics;
create policy goal_metrics_owner_all
on public.goal_metrics
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists plan_items_owner_all on public.plan_items;
create policy plan_items_owner_all
on public.plan_items
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists progress_entries_owner_all on public.progress_entries;
create policy progress_entries_owner_all
on public.progress_entries
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists ai_sessions_owner_select on public.ai_sessions;
create policy ai_sessions_owner_select
on public.ai_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists goal_clarifications_owner_select on public.goal_clarifications;
create policy goal_clarifications_owner_select
on public.goal_clarifications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists plans_owner_select on public.plans;
create policy plans_owner_select
on public.plans
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists weekly_reviews_owner_select on public.weekly_reviews;
create policy weekly_reviews_owner_select
on public.weekly_reviews
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists dashboard_snapshots_owner_select on public.dashboard_snapshots;
create policy dashboard_snapshots_owner_select
on public.dashboard_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

commit;
```

**Закрываемые риски**

`profiles_owner_all`: пользователь не может читать или менять настройки другого пользователя.

`goals_owner_all`: закрывает доступ к чужим целям и подмену `user_id` при создании или обновлении цели.

`goal_metrics_owner_all`: пользователь не может менять метрики чужой цели и искажать чужой дашборд.

`plan_items_owner_all`: пользователь может работать только со своими задачами. Связки `(plan_id, goal_id, user_id)` в внешних ключах дополнительно не дают привязать задачу к чужому плану.

`progress_entries_owner_all`: пользователь не может создавать, читать или править чужие отметки выполнения.

`ai_sessions_owner_select`: пользователь видит только свои AI-сессии. Прямые клиентские `insert/update/delete` не открыты, иначе пользователь смог бы подделать AI-ответ, модель, токены или ошибку. Запись должна идти через Edge Functions.

`goal_clarifications_owner_select`: пользователь видит только свои уточнения цели. Изменение результата уточнения лучше делать через Edge Function, чтобы не дать клиенту подделать AI-структуру.

`plans_owner_select`: пользователь видит только свои планы. Генерация и замена плана остаются серверной операцией.

`weekly_reviews_owner_select`: пользователь видит только свои недельные обзоры. Клиентская запись не открыта, чтобы нельзя было подделать AI-рекомендации.

`dashboard_snapshots_owner_select`: пользователь видит только свои агрегаты прогресса. Пересчёт должен быть серверным, иначе клиент сможет подделать процент выполнения или уровень риска.

Для `ai_prompt_templates` политики не создаются намеренно: таблица остаётся недоступной для `authenticated`, чтобы пользователи не читали и не меняли серверные промпты.
````

**Результат шага:** Codex сформировал RLS-слой: `enable row level security` на всех таблицах (11) и 10 политик на `auth.uid()` (15 обращений), включая намеренный запрет доступа роли `authenticated` к серверным таблицам (например, к шаблонам промптов). В принятой миграции реализован эквивалент по объёму MVP: RLS включён на всех таблицах, политики владения `auth.uid() = user_id`; для `tasks` и `task_completions` владение дополнительно проверяется через принадлежность родительской цели/задачи (`exists (...)`).

## Этап 4. Проверить сценарии frontend и AI

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

```text
| scenario | required tables | missing fields | risk | recommendation |
|---|---|---|---|---|
| Создать цель | `auth.users`, `profiles`, `goals`, опционально `goal_metrics` | Блокирующих нет. Желательно добавить авто-создание `profiles` при регистрации; `target_date` закрывает SMART time-bound, но отдельного `smart_time_bound` нет. | Цель можно создать, но профиль пользователя может отсутствовать, если его не создать триггером или приложением. | Оставить `goals` как основную точку создания цели. Добавить trigger/RPC для bootstrap `profiles` или гарантированный upsert на первом входе. |
| Получить AI clarify | `goals`, `ai_sessions`, `goal_clarifications`, `ai_prompt_templates` | Нет `applied_at`; нет жёсткой связи, что `goal_clarifications.ai_session_id` указывает именно на `ai_sessions.type = 'clarify'`. | Схема поддерживает сценарий, но БД не запрещает связать уточнение с AI-сессией другого типа. | В Edge Function или триггере проверять `ai_sessions.type = 'clarify'` и `status = 'succeeded'`. Для MVP можно оставить несколько раундов через `round_no`. |
| Сохранить AI plan | `ai_sessions`, `plans`, `plan_items`, `goals`, опционально `goal_metrics` | Нет `completed_at` у `plan_items`; нет полей для повторяемости привычек; нет DB-инварианта, что `plans.ai_session_id` относится к `type = 'plan'`. | Версионность плана есть, но конкурентная генерация может упереться в `unique(goal_id, version)`. Старый активный план нужно явно переводить в `superseded`. | Сохранять сессию, план и элементы плана одной транзакцией в Edge Function. Проверять тип AI-сессии, назначать следующую версию серверно, старый активный план закрывать перед активацией нового. |
| Отметить задачу | `plan_items`, `progress_entries`, `dashboard_snapshots` | Нет `completed_at`, `status_changed_at`, `actual_effort_minutes`; в `progress_entries` нет явного типа события вроде `task_completed`. | Если использовать RLS из шага 3 (`plan_items_owner_all`), пользователь сможет не только отмечать, но и создавать/удалять элементы AI-плана. Это может ломать доверие к AI-плану. | Для строгого MVP дать клиенту только `select/update` по `plan_items`, а создание/удаление оставить Edge Function. Добавить `completed_at` и, при необходимости, серверный insert в `progress_entries` при переходе задачи в `done`. |
| Построить dashboard | `goals`, `plan_items`, `progress_entries`, `goal_metrics`, `dashboard_snapshots` | Нет пользовательского общего snapshot без `goal_id`; нет `calculated_at`, `period_start`, `period_end`, версии алгоритма расчёта. | Физический кэш может устаревать. Клиент видит snapshot, но схема не задаёт, кто и когда его пересчитывает. | Для раннего MVP проще считать дашборд запросом/RPC или view с `security_invoker`. Если оставить `dashboard_snapshots`, добавить серверный refresh-процесс и поля свежести расчёта. |
| Получить weekly review | `profiles`, `goals`, `progress_entries`, `plan_items`, `goal_metrics`, `ai_sessions`, `weekly_reviews`, `ai_prompt_templates` | Нет DB-инварианта, что `weekly_reviews.ai_session_id` указывает на `type = 'review'`; нет отдельной таблицы расписания/запусков review; timezone периода хранится только косвенно через `profiles.timezone`. | Сценарий поддержан для goal-level и user-level review, но корректность периода и типа AI-сессии держится на Edge Function. | Генерировать review серверно по `profiles.timezone` и `weekly_review_day`. Проверять `ai_sessions.type = 'review'`, сохранять входные данные в `ai_sessions.input_snapshot`, результат — в `weekly_reviews`. |
```

**Результат шага:** Codex прогнал сценарии MVP (создать цель, AI clarify, сохранить plan, отметить задачу, дашборд, weekly review) в таблице scenario / required tables / missing fields / risk / recommendation и зафиксировал ключевой вывод: AI-данные (`ai_sessions.input/output`, `weekly_reviews`) записывает сервер через Edge Function, а weekly review строится по `ai_sessions.type = "review"`. Это согласуется с архитектурным правилом проекта «OpenRouter только на серверной стороне».

## Этап 5. Финализировать ADR

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

```text
# ADR-005: Схема данных FocusTrack AI

## Context

FocusTrack AI — планировщик личных и рабочих целей с AI-планированием. MVP должен поддерживать:

- SMART-ввод цели;
- AI-уточнение цели через сессию `clarify`;
- генерацию AI-плана через сессию `plan`;
- дашборд прогресса;
- Weekly AI Review через сессию `review`;
- строгую изоляцию данных: каждый пользователь видит и меняет только свои данные;
- вызовы OpenRouter только на серверной стороне.

Проект строится на Supabase Cloud: PostgreSQL, Auth, Row Level Security и Edge Functions.

## Decision

Выбираем Supabase Cloud как основную backend-платформу для MVP.

Основные причины:

- Supabase Auth даёт готовую пользовательскую модель и `auth.uid()` для RLS.
- PostgreSQL подходит для реляционной доменной модели целей, планов, задач и прогресса.
- RLS позволяет enforce-ить изоляцию пользователей на уровне базы, а не только приложения.
- Edge Functions подходят для серверных AI-операций и скрывают ключи OpenRouter от клиента.
- Supabase ускоряет MVP: база, авторизация, политики доступа и серверные функции находятся в одной платформе.

Схема строится вокруг следующих таблиц:

- `profiles` — настройки пользователя поверх `auth.users`.
- `goals` — основная сущность цели.
- `goal_metrics` — измеримые показатели цели.
- `ai_sessions` — единый журнал AI-операций `clarify`, `plan`, `review`.
- `goal_clarifications` — результаты AI-уточнения цели.
- `plans` — версии AI-планов.
- `plan_items` — задачи, этапы и привычки внутри плана.
- `progress_entries` — ручные и серверные отметки прогресса.
- `weekly_reviews` — недельные AI-обзоры.
- `dashboard_snapshots` — кэш агрегатов дашборда.
- `ai_prompt_templates` — серверные шаблоны промптов.

Для пользовательских таблиц используется явный `user_id`. Это намеренная денормализация: RLS-политики становятся простыми, быстрыми и проверяемыми.

Связи между таблицами должны включать `user_id`, например `(goal_id, user_id)` и `(plan_item_id, goal_id, user_id)`. Это защищает от подстановки чужих идентификаторов при создании связанных записей.

AI-операции фиксируются через `ai_sessions`. Поля `input_snapshot`, `output`, `token_usage`, `error` хранятся в `jsonb`, потому что формат AI-входов и AI-ответов будет меняться быстрее, чем стабильная доменная схема.

Клиенту разрешается напрямую работать только с пользовательскими данными, которые он действительно должен менять:

- `profiles`, `goals`, `goal_metrics`, `progress_entries` — владелец может читать и менять свои строки.
- `plan_items` — владелец может читать и обновлять свои задачи, чтобы отмечать выполнение.
- `ai_sessions`, `goal_clarifications`, `plans`, `weekly_reviews`, `dashboard_snapshots` — клиент только читает свои строки.
- `ai_prompt_templates` — недоступна клиенту; используется только сервером через `service_role`.

Создание AI-сессий, уточнений, планов, недельных обзоров и пересчёт дашборда выполняются через Edge Functions. Эти функции:

- вызывают OpenRouter только с серверной стороны;
- сохраняют входной снимок запроса в `ai_sessions.input_snapshot`;
- сохраняют результат AI в доменные таблицы;
- проверяют тип AI-сессии: `clarify`, `plan` или `review`;
- выполняют связанные записи одной транзакцией;
- не доверяют клиенту AI-результаты, модель, токены и ошибки.

Для статусов выбираем `text + check`, а не PostgreSQL enum. Для MVP это проще менять миграциями.

Для планов сохраняем версионность через `plans.version`; активный план на цель ограничивается частичным уникальным индексом.

Для недельных обзоров поддерживаем два режима:

- `scope = 'goal'` — обзор одной цели;
- `scope = 'user'` — общий обзор активных целей пользователя.

## Consequences

Положительные последствия:

- Данные пользователей изолированы на уровне PostgreSQL через RLS.
- Даже при ошибке в клиентском коде пользователь не должен увидеть чужие строки.
- AI-результаты нельзя подделать прямой клиентской записью.
- Схема поддерживает повторные уточнения, версии планов и историю AI-сессий.
- `jsonb` в AI-журнале снижает цену изменений промптов и форматов ответов.
- Edge Functions дают единое место для OpenRouter, транзакций и серверной валидации.

Компромиссы:

- Схема более подробная, чем минимальный CRUD-MVP.
- `user_id` дублируется во многих таблицах.
- Некоторые инварианты остаются на уровне Edge Functions, а не чисто в БД: например, что `goal_clarifications.ai_session_id` ссылается именно на `type = 'clarify'`.
- `dashboard_snapshots` требует серверного refresh-процесса, иначе кэш может устаревать.
- Для `plan_items` нужно аккуратно ограничить клиентские права: пользователь должен отмечать задачи, но не должен подделывать структуру AI-плана, если продукт считает план AI-generated артефактом.

## Alternatives

1. Только Supabase Auth + таблицы без RLS

Отклонено. Изоляция пользователей только в приложении слишком рискованна для многопользовательского продукта. Ошибка в запросе или API-слое может раскрыть чужие цели, прогресс или AI-обзоры.

2. Отдельный backend вместо Edge Functions

Возможный путь после MVP, но на старте усложняет инфраструктуру. Edge Functions достаточно для AI-операций, серверных транзакций и защиты OpenRouter-ключей.

3. Хранить AI-уточнения, планы и обзоры только в `ai_sessions.output`

Отклонено. Такой подход упрощает запись, но ухудшает дашборд, фильтрацию задач, отметки прогресса и недельную аналитику. Доменные сущности должны быть нормализованы.

4. Разделить AI-сессии на `clarify_sessions`, `plan_sessions`, `review_sessions`

Отклонено для MVP. Единая `ai_sessions` проще для аудита, логирования, токенов, ошибок и трассировки AI-вызовов.

5. Использовать UUID для всех доменных сущностей

Не выбрано как обязательное решение. `bigint generated always as identity` подходит для внутренних идентификаторов, потому что доступ ограничен RLS. UUID можно добавить позже, если появится публичное шаринг-пространство или внешние ссылки.

6. Считать дашборд только запросами без `dashboard_snapshots`

Допустимая альтернатива для самого раннего MVP. Текущая схема оставляет `dashboard_snapshots` как физический кэш, но его можно заменить view или RPC, если пересчёт кэша пока преждевременен.

## Verification

Перед принятием миграции нужно проверить:

- Все пользовательские таблицы в `public` имеют включённый RLS.
- Для каждой пользовательской таблицы политика использует `(select auth.uid()) = user_id` или `(select auth.uid()) = id` для `profiles`.
- Пользователь A не может читать, создавать или менять строки пользователя B.
- Нельзя создать связанную запись с чужим `goal_id`, `plan_id`, `plan_item_id` или `goal_metric_id`.
- Клиент не может писать в `ai_sessions`, `goal_clarifications`, `plans`, `weekly_reviews`, `dashboard_snapshots` и `ai_prompt_templates`.
- Edge Function может создать AI-сессию, план и элементы плана одной транзакцией.
- Edge Function проверяет соответствие типа AI-сессии доменной операции: `clarify`, `plan`, `review`.
- `plans_one_active_per_goal_idx` не позволяет иметь два активных плана на одну цель.
- `weekly_reviews` не позволяет смешивать `scope = 'goal'` без `goal_id` и `scope = 'user'` с `goal_id`.
- OpenRouter-ключи отсутствуют в клиенте и используются только в Edge Functions.
- Если используются view для дашборда, они создаются с `security_invoker = true` или не открываются клиентским ролям.
```

**Результат шага:** Codex собрал итоговый ADR-005 «Схема данных FocusTrack AI» с разделами Context / Decision / Consequences / Alternatives / Verification: Supabase + PostgreSQL + RLS + Edge Functions, доступ к данным только через RLS, view с `security_invoker = true`. Решение согласуется с принятым стеком проекта, зафиксированным в `docs/architecture/adr/001-tech-stack.md`.

## Итог методологии

Цепочка выполнена и зафиксирована по шагам: Codex сначала закрепил домен, затем спроектировал SQL, затем безопасность (RLS), затем проверку сценариев и только после этого оформил решение в ADR. Такой процесс снижает риск получить красивую, но непроверенную схему, и делает каждый шаг отдельно верифицируемым. Финальная принятая схема и политики реализованы в `supabase/migrations/`, а решение по стеку — в `docs/architecture/adr/001-tech-stack.md`.
