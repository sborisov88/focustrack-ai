# ДЗ 6 — security audit

## Проверенная поверхность

- frontend code;
- Supabase schema;
- RLS policies;
- Edge Functions;
- OpenRouter integration;
- env handling;
- CI workflow.

## Найденные риски и решения

| Риск                            | Статус           | Решение                                                                |
| ------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| OpenRouter key во frontend      | исправлено       | ключ используется только в Supabase Edge Functions                     |
| Service role key в браузере     | не найдено       | frontend использует только publishable key                             |
| RLS выключен                    | исправлено       | RLS включен на пользовательских таблицах                               |
| Новые таблицы не видны Data API | исправлено       | добавлены явные grants для `authenticated`                             |
| Лишние grants для `anon`        | исправлено       | добавлена миграция `20260617033231_restrict_anon_table_grants.sql`     |
| Ошибки могут раскрыть секреты   | частично закрыто | функции возвращают сообщение без headers и key values                  |
| Публичные AI Edge Functions     | исправлено       | `verify_jwt=true` для AI/RAG функций; публичным оставлен только health |
| Секреты в Git                   | не найдено       | `.env.local` в `.gitignore`, `.env.example` без секретов               |

## OWASP notes

### Injection

Frontend не строит SQL вручную. CRUD идёт через Supabase client, AI payload сериализуется как JSON.

### Broken Access Control

Основная защита — RLS policies по `auth.uid()`.

### Sensitive Data Exposure

Секреты OpenRouter и Supabase service role не используются во frontend.

### Security Logging

Для MVP логируются AI-сессии без секретов. Production-версия должна добавить централизованные алерты.

## npm audit

Перед сдачей нужно запускать:

```bash
pnpm audit
```

Если audit обнаруживает high/critical, зависимость обновляется или фиксируется исключение с обоснованием.

Фактическая проверка 17 июня 2026:

```text
pnpm audit --audit-level high
No known vulnerabilities found
```

## Production checklist

- оставить `verify_jwt=true` для AI/RAG-функций;
- добавить rate limits;
- настроить OAuth provider secrets в Supabase;
- ограничить CORS доменом деплоя;
- включить Supabase alerts;
- добавить регулярный dependency audit в CI.

## Supabase smoke 17 июня 2026

```text
GET /functions/v1/health -> 200
POST /functions/v1/ai-weekly-review без JWT -> 401
OpenRouter model -> google/gemini-2.5-flash-lite
```
