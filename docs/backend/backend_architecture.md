# Backend Architecture

FocusTrack AI использует **Supabase-first backend**: отдельный Express/Nest/FastAPI-сервер на первом этапе не нужен. База данных, авторизация, политики доступа, серверные функции и журналы AI-вызовов размещаются в Supabase Cloud.

## Целевой стек

| Часть backend-а | Решение |
|-----------------|---------|
| База данных | Supabase PostgreSQL |
| Авторизация | Supabase Auth |
| Разграничение доступа | PostgreSQL Row Level Security |
| CRUD API | Supabase REST API и Supabase client |
| Серверная AI-логика | Supabase Edge Functions |
| LLM-провайдер | OpenRouter |
| Секреты | Supabase secrets |
| Миграции | `supabase/migrations/` |
| Функции | `supabase/functions/` |

## Общая схема

```text
React frontend
  |
  | Supabase client
  v
Supabase Cloud
  |-- Auth
  |-- PostgreSQL
  |-- RLS policies
  |-- REST API
  `-- Edge Functions
        |
        | server-side request
        v
      OpenRouter
```

## Основной принцип

Frontend не вызывает OpenRouter напрямую и не хранит LLM-секреты. Все AI-вызовы проходят через Supabase Edge Functions:

1. frontend получает сессию пользователя через Supabase Auth;
2. frontend вызывает Edge Function с пользовательским JWT;
3. Edge Function проверяет пользователя и входные данные;
4. Edge Function вызывает OpenRouter с серверным секретом;
5. результат сохраняется в PostgreSQL;
6. frontend получает структурированный ответ.

## Основные backend-сценарии

### AI-уточнение цели

```text
goal draft
  -> ai-clarify
  -> OpenRouter
  -> ai_sessions
  -> clarification questions
```

Функция `ai-clarify` принимает черновик цели, формирует уточняющие вопросы и сохраняет входные/выходные данные в `ai_sessions`.

### AI-планирование

```text
confirmed goal
  -> ai-plan
  -> OpenRouter
  -> goals + tasks + ai_sessions
  -> two-week plan
```

Функция `ai-plan` превращает подтверждённую цель в этапы и задачи. Результат сохраняется в таблицах `goals` и `tasks`.

### Weekly AI Review

```text
last 7 days facts
  -> ai-weekly-review
  -> OpenRouter
  -> weekly_reviews + ai_sessions
  -> recommendations
```

Функция `ai-weekly-review` читает фактический прогресс пользователя за неделю, отправляет в модель только необходимые данные и сохраняет итоговый обзор в `weekly_reviews`.

## Минимальная модель данных

| Таблица | Назначение |
|---------|------------|
| `profiles` | профиль пользователя, связанный с Supabase Auth |
| `goals` | цели пользователя |
| `tasks` | задачи внутри цели |
| `task_completions` | факты выполнения задач по дням |
| `ai_sessions` | журнал AI-запросов, ответов, модели, статуса и ошибок |
| `weekly_reviews` | еженедельные AI-обзоры прогресса |

Все пользовательские таблицы должны иметь `user_id`. Для таблиц с пользовательскими данными RLS обязательна: пользователь может читать и изменять только свои строки.

## API-подход

Для обычных операций используется Supabase client:

- создать цель;
- получить список целей;
- обновить задачу;
- отметить выполнение;
- получить данные дашборда.

Для операций с серверной логикой используются Edge Functions:

- `ai-clarify`;
- `ai-plan`;
- `ai-weekly-review`;
- позднее `health` для диагностики.

## Безопасность

1. `OPENROUTER_API_KEY` хранится только в Supabase secrets.
2. Service role key не используется во frontend.
3. Все таблицы с пользовательскими данными защищены RLS.
4. Edge Functions принимают только авторизованные запросы, кроме явных публичных health-check endpoints.
5. AI-запросы логируются в `ai_sessions`, но без приватных секретов и лишних персональных данных.
6. Ошибки OpenRouter не раскрывают пользователю внутренние ключи, заголовки или полный payload.

## Почему не отдельный backend-сервер

На первом этапе Supabase закрывает основные backend-потребности продукта:

- PostgreSQL для данных;
- Auth для входа пользователя;
- RLS для изоляции пользовательских строк;
- REST API для CRUD;
- Edge Functions для серверных AI-вызовов;
- logs и tooling для диагностики.

Отдельный Node.js/FastAPI/NestJS backend можно добавить позже, если появятся требования, которые неудобно закрывать Supabase Edge Functions: сложные фоновые задачи, нестандартные интеграции, отдельный публичный API или специализированная очередь.

## Следующие шаги реализации

1. Добавить `supabase/config.toml`.
2. Создать первую миграцию с таблицами `profiles`, `goals`, `tasks`, `task_completions`, `ai_sessions`, `weekly_reviews`.
3. Добавить RLS policies для пользовательских таблиц.
4. Реализовать Edge Functions `ai-clarify`, `ai-plan`, `ai-weekly-review`.
5. Подключить frontend к Supabase client и Edge Functions.
6. Добавить backend-документацию с примерами запросов и проверками.
