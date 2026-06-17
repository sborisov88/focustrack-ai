# ДЗ 2: методология сложного запроса

## Сложная задача

Спроектировать начальную схему данных FocusTrack AI для Supabase так, чтобы она поддерживала:

- цели пользователя;
- задачи внутри целей;
- отметки выполнения;
- AI-сессии `clarify`, `plan`, `weekly-review`;
- weekly reviews;
- RLS: пользователь видит и меняет только свои данные.

## Почему задача сложная

Она затрагивает продуктовые сущности, backend-архитектуру, безопасность, будущий frontend и AI-функции. Если попросить Codex сразу «сделай базу», можно получить неполную схему без RLS, аудита AI-сессий или связей с Weekly AI Review.

## Chain-of-Thought как процесс

В артефакте не фиксируется скрытое рассуждение модели. Вместо этого используется пошаговая декомпозиция задачи: каждый шаг получает отдельный промпт, входной контекст и проверяемый результат.

## Шаг 1. Уточнить домен

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

**Ожидаемый результат:** список `goals`, `tasks`, `task_completions`, `ai_sessions`, `weekly_reviews`, связь с пользователем Supabase Auth.

## Шаг 2. Спроектировать таблицы

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

**Ожидаемый результат:** черновик миграции с таблицами и связями.

## Шаг 3. Добавить RLS

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

**Ожидаемый результат:** `enable row level security`, policies на `auth.uid()`.

## Шаг 4. Проверить сценарии frontend и AI

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

**Ожидаемый результат:** список недостающих индексов, статусов, полей сортировки или JSONB-структур.

## Шаг 5. Финализировать ADR

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

**Ожидаемый результат:** основа для `docs/architecture/adr/001-tech-stack.md` или отдельного ADR по данным.

## Итог методологии

Такой процесс снижает риск получить красивую, но непроверенную схему. Codex сначала фиксирует домен, затем SQL, затем безопасность, затем проверку сценариев и только после этого оформляет решение.
