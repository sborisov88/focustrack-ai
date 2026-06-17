# ДЗ 5 — отчет по backend-отладке

## Что было сделано

1. Установлен Supabase CLI.
2. Создана структура `supabase/`.
3. Подготовлена SQL-миграция схемы FocusTrack AI.
4. Включены RLS policies.
5. Добавлены Edge Functions:
   - `ai-clarify`;
   - `ai-plan`;
   - `ai-weekly-review`;
   - `rag-answer`;
   - `health`.
6. OpenRouter подключен через Supabase secrets.
7. Frontend подключен к Supabase client и Edge Functions.

## Отладка

Первичная проблема была не в Supabase, а в сетевом слое macOS: Clash Verge / mihomo в fake-ip TUN-режиме подменял Supabase DB host на `198.18.*`, из-за чего прямой `supabase db push` падал на TLS/timeout.

После исправления сетевых правил:

```text
supabase db push --workdir . --yes
Remote database is up to date.
```

## Проверенная поверхность

| Поверхность                    | Статус              |
| ------------------------------ | ------------------- |
| Локальный Supabase             | работает            |
| Cloud Supabase project         | linked              |
| Миграции                       | применены           |
| RLS                            | включен на таблицах |
| Edge Functions                 | deployed            |
| OpenRouter через Edge Function | smoke OK            |
| Frontend fallback demo-mode    | работает            |

`supabase functions list --workdir .` показывает активные функции:

- `ai-clarify`;
- `ai-plan`;
- `ai-weekly-review`;
- `rag-answer`;
- `health`.

## Остаточные production-задачи

- включить JWT verification для AI-функций;
- добавить rate limit на AI-вызовы;
- настроить Supabase OAuth provider secrets;
- включить алерты в Supabase/Vercel после деплоя frontend.
