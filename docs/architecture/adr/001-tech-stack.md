# ADR-001: стек FocusTrack AI

## Статус

Принято 17 июня 2026.

## Контекст

Нужно быстро довести продукт до fullstack MVP. Требуется стек, который не раскрывает LLM-секреты во frontend и поддерживает воспроизводимую инфраструктуру.

## Решение

Использовать:

- React + TypeScript + Vite для frontend;
- shadcn/ui + Tailwind для интерфейса;
- React Query для клиентского data layer;
- Supabase Cloud для PostgreSQL, Auth, RLS и Edge Functions;
- OpenRouter только из Supabase Edge Functions;
- Vitest и Playwright для тестов;
- GitHub Actions для CI и опционального Supabase deploy.

## Причины

1. Supabase закрывает DB, Auth, RLS, REST API, Edge Functions и логи без отдельного backend-сервера.
2. OpenRouter ключ можно держать в Supabase secrets и не передавать в браузер.
3. shadcn/ui даёт готовые доступные компоненты без тяжёлой дизайн-системы.
4. Vite + React быстрее всего подходит для MVP и локального запуска.
5. Playwright даёт воспроизводимые видео и скриншоты для регрессионных проверок.

## Последствия

Плюсы:

- быстрый путь до рабочего MVP;
- меньше инфраструктурного кода;
- понятная схема безопасности;
- легко демонстрировать локально и в cloud.

Минусы:

- часть backend-логики зависит от Supabase;
- Edge Functions на Deno требуют отдельной отладки;
- для production нужно включить строгий JWT-контур на AI-функциях.

## Альтернативы

| Альтернатива                  | Почему не выбрана                     |
| ----------------------------- | ------------------------------------- |
| Express/Nest + PostgreSQL     | Дольше поднимать Auth, RLS и деплой   |
| Firebase                      | Меньше контроля над SQL-моделью       |
| Только локальный backend      | Хуже для cloud-деплоя и удалённого доступа |
| Прямой OpenRouter из frontend | Нельзя безопасно хранить API key      |

## Production hardening

Перед реальным пользовательским трафиком:

- поддерживать JWT verification для AI/RAG Edge Functions и публичным оставлять только `health`;
- настроить OAuth provider secrets в Supabase;
- добавить rate limits на AI-вызовы;
- настроить мониторинг и алерты;
- добавить отдельную таблицу billing/cost tracking для LLM.
