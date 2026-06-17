# ДЗ 5 — Backend и интеграция с Frontend

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47737/

## Что сдавать

| Требование            | Файл                                               |
| --------------------- | -------------------------------------------------- |
| Backend architecture  | `docs/backend/backend_architecture.md`             |
| Backend documentation | `docs/backend/backend_documentation.md`            |
| Backend debug report  | `docs/backend/backend_report.md`                   |
| Миграции              | `supabase/migrations/`                             |
| Edge Functions        | `supabase/functions/`                              |
| Frontend integration  | `src/lib/supabase.ts`, `src/lib/focustrack-api.ts` |

## Инфраструктура

- Supabase Cloud;
- PostgreSQL 17;
- RLS policies;
- `anon` без прямых прав на продуктовые таблицы;
- `authenticated` с CRUD-правами через RLS;
- Supabase Edge Functions;
- OpenRouter через Supabase secrets;
- AI/RAG функции с `verify_jwt=true`, публичный только `health`.

## Проверка

```bash
supabase db push --workdir . --yes
supabase functions deploy ai-clarify --workdir .
supabase functions deploy ai-plan --workdir .
supabase functions deploy ai-weekly-review --workdir .
supabase functions deploy rag-answer --workdir .
supabase functions deploy health --workdir .
```

Фактический smoke 17 июня 2026:

```text
supabase db push --workdir . --yes -> применена 20260617033231_restrict_anon_table_grants.sql
GET /functions/v1/health -> 200
POST /functions/v1/ai-weekly-review без JWT -> 401
```

## Текст для отправки

```text
Добрый день! Сдаю ДЗ 5 по FocusTrack AI.

Backend развернут на Supabase Cloud. В репозитории есть миграции, RLS policies, ограниченные grants, JWT-protected Edge Functions и frontend-интеграция.
Документация:
- docs/backend/backend_documentation.md
- docs/backend/backend_report.md
- supabase/migrations/
- supabase/functions/
```
