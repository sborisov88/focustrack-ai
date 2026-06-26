# Prompt methodology

## Цель

Этот документ фиксирует, как FocusTrack AI использует AI-инструменты в разработке продукта: для декомпозиции требований, проверки архитектурных решений, проектирования запросов к модели и ревью рисков. Он описывает текущую реализацию, а не исторические черновики.

## Подход

Рабочий цикл строится вокруг коротких проверяемых промптов:

1. Сформулировать одну инженерную задачу.
2. Передать AI только релевантный контекст: продуктовую цель, ограничения, текущий стек и файлы, которые можно менять.
3. Запросить структурированный результат: список решений, рисков, тестов или JSON-контракт.
4. Проверить ответ по текущему коду, тестам и документации.
5. Сохранить только подтверждённые решения в коде или product docs.

AI-ответ не считается источником истины сам по себе. Источник истины для продукта — текущий код, миграции, тесты и production-smoke.

## Выполненная CoT-цепочка для ДЗ 2

Для домашнего задания использовалась внешняя Chain-of-Thought-декомпозиция: не скрытые рассуждения модели, а проверяемая цепочка шагов, промптов, ответов агента, результатов и инженерной проверки.

Фактический прогон выполнен 2026-06-17 через Codex CLI (`@openai/codex` 0.139.0), модель `gpt-5.5`, команда `codex exec --skip-git-repo-check --ephemeral -s read-only`. Каждый шаг запускался последовательно: вывод предыдущего шага передавался как входной контекст следующего. Ниже зафиксирован журнал выполнения в формате **промпт → ответ агента → результат**.

### Шаг 1. Уточнить домен

**Промпт:** перечислить доменные сущности MVP и связи между ними для FocusTrack AI.

**Ответ агента:**

```text
| entity | purpose | key fields | relations | open questions |
|---|---|---|---|---|
| `users` / `profiles` | Пользовательский контекст поверх Supabase Auth | `id`, `email`, `timezone`, `locale`, `weekly_review_day`, `created_at` | `profiles.id` = `auth.users.id`; 1 пользователь -> много целей, ИИ-сессий, обзоров | Нужен ли отдельный профиль в MVP или достаточно `auth.users` + настройки позже? |
| `goals` | Главная доменная сущность: личная или рабочая SMART-цель | `id`, `user_id`, `title`, `description`, `category`, `smart_specific`, `smart_measurable`, `smart_achievable`, `smart_relevant`, `target_date`, `status`, `created_at`, `updated_at` | Пользователь 1:N цели; цель 1:N уточнения, планы, задачи, прогресс, обзоры | Хранить SMART-поля строго структурно или часть оставить в свободном тексте? |
| `ai_sessions` | Единый журнал ИИ-взаимодействий: `clarify`, `plan`, `review` | `id`, `user_id`, `goal_id`, `type`, `status`, `input_snapshot`, `output`, `model`, `token_usage`, `error`, `created_at` | Принадлежит пользователю; может быть связана с целью; порождает уточнение, план или недельный обзор | Делать одну универсальную таблицу или отдельные таблицы под каждый тип ИИ-операции? |
```

**Результат:** из ответа взяты базовые сущности `profiles`, `goals`, `tasks`, `task_completions`, `ai_sessions`, `weekly_reviews`; лишние сущности вроде `dashboard_snapshots` и `ai_prompt_templates` отложены за пределы MVP.

### Шаг 2. Спроектировать таблицы

**Промпт:** на основе сущностей из шага 1 предложить PostgreSQL/Supabase SQL-схему с внешними ключами, timestamp-полями, `user_id` и JSONB для AI-входа/выхода.

**Ответ агента:**

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
```
````

**Результат:** Codex предложил расширенную схему с `profiles`, `goals`, `ai_sessions`, `plans`, `plan_items`, `progress_entries`, `weekly_reviews` и вспомогательными таблицами. В принятой миграции схема упрощена под MVP: задачи сведены в `tasks`, отметки выполнения — в `task_completions`, AI-лог — в `ai_sessions` с JSONB `input`/`output`.

### Шаг 3. Добавить RLS

**Промпт:** добавить Row Level Security policies, чтобы пользователь читал и менял только свои `goals`, `tasks`, completions, `ai_sessions` и `weekly_reviews`.

**Ответ агента:**

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

create policy profiles_owner_all
on public.profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
```
````

**Результат:** в принятой реализации RLS включён на пользовательских таблицах; политики владения используют `auth.uid() = user_id`, а для связанных `tasks` и `task_completions` дополнительно проверяется принадлежность родительской цели или задачи.

### Шаг 4. Проверить сценарии frontend и AI

**Промпт:** проверить, поддерживает ли схема сценарии MVP: создать цель, получить AI clarify, сохранить AI plan, отметить задачу, построить dashboard, получить weekly review.

**Ответ агента:**

```text
| scenario | required tables | missing fields | risk | recommendation |
|---|---|---|---|---|
| Создать цель | `auth.users`, `profiles`, `goals`, опционально `goal_metrics` | Блокирующих нет. Желательно добавить авто-создание `profiles` при регистрации; `target_date` закрывает SMART time-bound, но отдельного `smart_time_bound` нет. | Цель можно создать, но профиль пользователя может отсутствовать, если его не создать триггером или приложением. | Оставить `goals` как основную точку создания цели. Добавить trigger/RPC для bootstrap `profiles` или гарантированный upsert на первом входе. |
| Получить AI clarify | `goals`, `ai_sessions`, `goal_clarifications`, `ai_prompt_templates` | Нет `applied_at`; нет жёсткой связи, что `goal_clarifications.ai_session_id` указывает именно на `ai_sessions.type = 'clarify'`. | Схема поддерживает сценарий, но БД не запрещает связать уточнение с AI-сессией другого типа. | В Edge Function или триггере проверять `ai_sessions.type = 'clarify'` и `status = 'succeeded'`. |
```

**Результат:** проверка подтвердила основные MVP-сценарии и выделила инженерное правило: AI-данные (`ai_sessions.input/output`, `weekly_reviews`) записываются сервером через Edge Functions, а не прямой клиентской записью.

### Шаг 5. Финализировать ADR

**Промпт:** оформить итоговое решение по схеме данных в ADR с разделами Context, Decision, Consequences, Alternatives, Verification.

**Ответ агента:**

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
```

**Результат:** итоговое архитектурное решение оформлено в `docs/architecture/adr/001-tech-stack.md` и согласовано с выбранным стеком: Supabase Cloud, PostgreSQL, Auth, RLS, Edge Functions и OpenRouter только на серверной стороне.

## Текущая модель данных

Актуальная схема хранится в `supabase/migrations/` и состоит из следующих пользовательских таблиц:

| Таблица                | Назначение                                           |
| ---------------------- | ---------------------------------------------------- |
| `profiles`             | профиль пользователя и настройки review              |
| `goals`                | цели пользователя                                    |
| `tasks`                | задачи внутри цели                                   |
| `task_completions`     | факты выполнения задач                               |
| `ai_sessions`          | журнал AI-вызовов, модели, входа, выхода и статуса   |
| `weekly_reviews`       | еженедельные AI-обзоры                               |
| `knowledge_documents`  | личные заметки пользователя                          |
| `knowledge_chunks`     | chunks заметок с `vector(1024)` embeddings           |
| `knowledge_answers`    | RAG-ответы с citations и retrieval metadata          |
| `function_invocations` | журнал rate-limit проверок защищённых Edge Functions |

Все пользовательские таблицы имеют `user_id`, RLS и owner-scoped policies. Новые таблицы получают явные grants для роли `authenticated`, потому что доступность через Data API не должна зависеть от implicit defaults.

## AI-контракты

| Сценарий          | Edge Function              | Вход                                   | Выход                                 | Сохранение                             |
| ----------------- | -------------------------- | -------------------------------------- | ------------------------------------- | -------------------------------------- |
| Уточнение цели    | `ai-clarify`               | черновик цели, описание, ограничения   | список вопросов                       | frontend сохраняет связанную AI-сессию |
| Планирование      | `ai-plan`                  | цель, дедлайн, ответы                  | краткий план и задачи                 | frontend сохраняет `tasks` и AI-сессию |
| Weekly review     | `ai-weekly-review`         | completed/blocked tasks и progress     | обзор недели                          | `weekly_reviews` и AI-сессия           |
| Индексация знания | `embed-knowledge-document` | `documentId`                           | статус, chunks, модель, размерность   | `knowledge_chunks`, статус документа   |
| Ответ по заметкам | `rag-answer`               | вопрос и optional `selectedDocumentId` | grounded answer, citations, retrieval | `knowledge_answers`                    |

OpenRouter вызывается только из Supabase Edge Functions. Frontend не хранит LLM-секреты и не вызывает модель напрямую.

## Rate limit и безопасность запросов

Защищённые Edge Functions требуют пользовательский JWT и используют общий rate-limit слой:

- `requireAuthenticatedUser(request)` проверяет роль `authenticated` и наличие `sub`;
- `createUserSupabaseClient(request)` создаёт user-scoped client с тем же JWT;
- `enforceRateLimit(...)` пишет событие в `function_invocations` и возвращает `429` при превышении лимита;
- лимит по умолчанию: 60 запросов на функцию за 3600 секунд;
- настройка: `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`, либо `RATE_LIMIT_<FUNCTION>_MAX`.

Ошибки возвращаются в едином JSON-формате. Для rate limit ответ содержит:

```json
{
  "error": "Слишком много запросов. Повторите позже.",
  "retryAfterSeconds": 3600
}
```

## Примеры рабочих промптов

### Проверка RLS

```text
Проверь текущие миграции Supabase. Найди все таблицы public, укажи,
есть ли enable row level security, owner-scoped select/insert/update/delete
policies и явные grants для authenticated. Верни только подтверждённые
расхождения с file:line.
```

### Проверка Edge Function

```text
Проверь Edge Function <name>. Убедись, что она проверяет JWT, валидирует
payload, не логирует секреты, использует общий CORS helper, корректно
возвращает ошибки и не вызывает OpenRouter из frontend-контекста.
```

### Проверка product docs

```text
Сверь публичную документацию с текущими файлами src/, supabase/ и .github/.
Найди устаревшие утверждения, ссылки на несуществующие artifacts, fixed
asset hashes и внутренние процессные маркеры. Верни список правок.
```

## Проверка результата

Каждый AI-assisted шаг считается завершённым только после инженерной проверки:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
pnpm audit --audit-level high
```

Для Edge Functions дополнительно выполняется:

```bash
(cd supabase/functions/ai-clarify && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/ai-plan && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/ai-weekly-review && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/rag-answer && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/embed-knowledge-document && deno check --no-lock --node-modules-dir=auto index.ts)
(cd supabase/functions/health && deno check --no-lock --node-modules-dir=auto index.ts)
```
