# Отчет о разработке frontend

## Цель

Собрать рабочий frontend FocusTrack AI по продуктовому ТЗ и правилам проекта из `AGENTS.md`.

## Стек

- React 19;
- TypeScript 6;
- Vite 8;
- shadcn/ui;
- Tailwind CSS 4;
- React Query;
- Recharts;
- Vitest;
- Playwright.

## Реализовано

| Требование       | Реализация                                   |
| ---------------- | -------------------------------------------- |
| Дашборд целей    | `FocusTrackDashboard`                        |
| Список целей     | `GoalList`                                   |
| Детали цели      | `GoalDetail`                                 |
| Задачи и статусы | shadcn Checkbox + Badge                      |
| Прогресс         | shadcn Progress + Recharts                   |
| Weekly AI Review | кнопка `AI Review` и панель результата       |
| Knowledge/RAG    | блок документов и Edge Function `rag-answer` |
| OAuth            | кнопка Google через Supabase Auth            |
| Аналитика        | `trackEvent` с поддержкой Яндекс.Метрики     |

## shadcn/ui

Интерфейс собран на shadcn-компонентах:

- `Button`;
- `Card`;
- `Dialog`;
- `Sidebar`;
- `Table`;
- `Tabs`;
- `Select`;
- `Progress`;
- `Chart`;
- `Alert`;
- `Tooltip`;
- `Sonner`.

## AI-техники разработки

Использованные подходы:

- сначала требования и user stories, затем код;
- переиспользуемые prompt templates для компонента, тестов и багфикса;
- AI-анализ ошибок TypeScript и ESLint;
- AI-проверка негативных сценариев: пустые данные, отсутствие Supabase env, ошибка OpenRouter;
- Playwright для визуальной проверки desktop/mobile.

## Найденные и исправленные проблемы

| Проблема                                   | Исправление                                                        |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Нужен запрет прямого `useEffect`           | Добавлены ESLint-правила и `useSyncExternalStore` для mobile state |
| Supabase env может отсутствовать           | Добавлен demo-mode fallback                                        |
| OpenRouter ключ нельзя хранить во frontend | AI-вызовы вынесены в Supabase Edge Functions                       |
| Нужна визуальная регрессия для проверки UI | Добавлены Playwright screenshots/video                             |

## Тесты

Unit:

- `src/lib/progress.test.ts` проверяет расчет прогресса, группировку задач и подписи статусов.

E2E:

- `tests/e2e/focustrack.spec.ts` проверяет desktop happy path;
- отдельный mobile smoke проверяет доступность ключевого контента.

Команды:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
```

## Вывод

Frontend MVP реализован как рабочее приложение, а не как лендинг: пользователь может создать цель, отметить задачу, увидеть прогресс и запустить weekly review. Дальше основной риск — production hardening авторизации и AI rate limits.
