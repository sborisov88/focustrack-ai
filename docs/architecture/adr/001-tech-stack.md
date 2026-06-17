# ADR-001: стек FocusTrack AI

## Статус

Принято 17 июня 2026.

## Контекст

Проект должен пройти через ДЗ 3–6 и стать основой дипломной работы OTUS. Нужен стек, который позволяет быстро показать fullstack MVP, не раскрывает LLM-секреты во frontend и поддерживает проверяемую инфраструктуру.

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
4. Vite + React быстрее всего подходит для учебного MVP и локального демо.
5. Playwright даёт проверяемые видео и скриншоты для сдачи.

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
| Только локальный backend      | Хуже для проверки ДЗ 5–6 и cloud-demo |
| Прямой OpenRouter из frontend | Нельзя безопасно хранить API key      |

## Production hardening

Перед реальным пользовательским трафиком:

- включить JWT verification для AI Edge Functions;
- настроить OAuth provider secrets в Supabase;
- добавить rate limits на AI-вызовы;
- настроить мониторинг и алерты;
- добавить отдельную таблицу billing/cost tracking для LLM.
