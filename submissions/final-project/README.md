# Проектная работа — FocusTrack AI

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47773/

## Тема

FocusTrack AI — AI-планировщик личных и рабочих целей с AI-уточнением, планом задач, прогрессом, еженедельным AI-ревью и ответами по личным заметкам (RAG).

Примеры целей продукта: «Пробежать первый полумарафон», «Сдать IELTS на 7.0», «Сформировать подушку безопасности на 6 месяцев», «Запустить лендинг пет-проекта».

## MVP

1. SMART-вход цели (личной или рабочей).
2. AI-уточнение и план задач.
3. Дашборд прогресса по целям и задачам.
4. Еженедельное AI-ревью (weekly review).
5. Supabase backend.
6. OpenRouter через JWT-protected Edge Functions.
7. RAG по личным заметкам (журнал тренировок, бюджет, план IELTS).

## Демо

Production:

```text
https://focustrack-ai.vercel.app
```

Локально:

```bash
pnpm install
pnpm dev
```

Проверочный сценарий (на жизненной цели):

1. открыть дашборд;
2. создать цель «Пробежать первый полумарафон»;
3. пройти AI-уточнение и получить AI-план задач;
4. отметить задачу выполненной и увидеть пересчет прогресса;
5. запустить еженедельное AI-ревью (weekly review);
6. задать RAG-вопрос по личным заметкам, например «на какой неделе была самая длинная пробежка»;
7. показать Supabase migration/RLS/functions;
8. показать Playwright evidence.

Фактический smoke 17 июня 2026 (ветка `audit-remediation-2026-06-17`, все шаги EXIT 0):

```text
typecheck/lint/unit/build/e2e -> pass
unit -> 12 passed в 2 файлах (src/lib/progress.test.ts + src/lib/focustrack-api.test.ts)
Playwright e2e -> 6 passed / 8 skipped: desktop dashboard flow, AI-clarify+AI-plan, RAG,
                  sidebar-навигация, login dialog, mobile usability
                  (skip — кросс-проектные дубли desktop/mobile и live-Supabase сценарий,
                  требующий env E2E_DEMO_EMAIL/E2E_DEMO_PASSWORD)
GET /functions/v1/health -> {service, status:"ok", checks, checkedAt}
POST /functions/v1/ai-weekly-review без JWT -> 401 (verify_jwt=true)
Playwright screenshots/video -> output/playwright/ и output/playwright/production/
```

Изменения этой итерации (актуализация по аудиту):

- убраны 2 неинтерактивные «мёртвые» кнопки UI: декоративный селектор (`data-testid="knowledge-source-select"`)
  удалён из карточки «Категории целей» (рабочий селектор источника RAG — `rag-source-select`); индикаторы
  Supabase/OpenRouter в sidebar теперь обычные статусные строки, а не кликабельные кнопки;
- расширено unit-покрытие: добавлен `src/lib/focustrack-api.test.ts` (валидация RAG-вопроса и пустого списка
  документов, демо-фоллбэки AI/RAG без сессии, пересчёт прогресса в `toggleTask` и edge на несуществующую задачу);
- бэкенд: структурированное JSON-логирование (`supabase/functions/_shared/logger.ts`) и явный CORS-allowlist
  вместо wildcard `*` (`supabase/functions/_shared/openrouter.ts`, `Vary: Origin`);
- фронтенд: реальная инициализация Яндекс.Метрики (`src/lib/analytics.ts` -> `initAnalytics()` из `src/main.tsx`),
  активна только при заданном `VITE_YANDEX_METRIKA_ID`, иначе безопасный no-op.

Повторная сверка требований: `submissions/reverification-audit-2026-06-17.md`.

## Что отправлять преподавателю

Основная ссылка:

```text
https://github.com/sborisov88/focustrack-ai
```

Дополнительные ориентиры внутри репозитория:

- финальный проект: `submissions/final-project/`;
- все сдачные материалы ДЗ 1-6: `submissions/`;
- матрица приемки: `submissions/acceptance-matrix.md`;
- evidence проекта: `submissions/final-project/evidence/`;
- демо-доступ: `DEMO_ACCESS.md`;
- production demo: `https://focustrack-ai.vercel.app`;
- финальный tag: `final-project-submitted`.

История сквозной разработки зафиксирована опубликованными Git tags:

| Этап | Tag |
| ---- | --- |
| Фаза 0 | [`phase-0-init`](https://github.com/sborisov88/focustrack-ai/tree/phase-0-init) |
| ДЗ 1 | [`hw1-submitted`](https://github.com/sborisov88/focustrack-ai/tree/hw1-submitted) |
| ДЗ 2 | [`hw2-submitted`](https://github.com/sborisov88/focustrack-ai/tree/hw2-submitted) |
| ДЗ 3 | [`hw3-submitted`](https://github.com/sborisov88/focustrack-ai/tree/hw3-submitted) |
| ДЗ 4 | [`hw4-submitted`](https://github.com/sborisov88/focustrack-ai/tree/hw4-submitted) |
| ДЗ 5 | [`hw5-submitted`](https://github.com/sborisov88/focustrack-ai/tree/hw5-submitted) |
| ДЗ 6 | [`hw6-submitted`](https://github.com/sborisov88/focustrack-ai/tree/hw6-submitted) |
| Проект | [`final-project-submitted`](https://github.com/sborisov88/focustrack-ai/tree/final-project-submitted) |

## Материалы защиты

| Раздел               | Файл                                      |
| -------------------- | ----------------------------------------- |
| Product docs         | `docs/product/`                           |
| Architecture         | `docs/architecture/architecture.md`, `docs/architecture/adr/001-tech-stack.md` |
| Frontend report      | `docs/frontend/development_report.md`     |
| Backend report       | `docs/backend/backend_report.md`          |
| Production deploy    | `docs/production-deployment.md`, `vercel.json` |
| Security             | `docs/security/security_audit.md`         |
| Release notes        | `docs/progress/release_notes.md`          |
| Presentation outline | `submissions/final-project/presentation.md` |
| Evidence             | `submissions/final-project/evidence/`, `output/playwright/`, `output/playwright/production/` |

## Текст для отправки темы/проекта

```text
Добрый день! Тема проектной работы: FocusTrack AI.

Это веб-приложение — AI-планировщик личных и рабочих целей с AI-уточнением, AI-планом задач, дашбордом прогресса, еженедельным AI-ревью и ответами по личным заметкам (RAG).
Примеры целей: «Пробежать первый полумарафон», «Сдать IELTS на 7.0», «Сформировать подушку безопасности на 6 месяцев», «Запустить лендинг пет-проекта».
Стек: React, TypeScript, shadcn/ui, Supabase Cloud, PostgreSQL, RLS, Supabase Edge Functions, OpenRouter.
GitHub: https://github.com/sborisov88/focustrack-ai
Production URL: https://focustrack-ai.vercel.app
Демо-доступ: DEMO_ACCESS.md
Материалы проектной работы: submissions/final-project/
Матрица приемки всех ДЗ и проекта: submissions/acceptance-matrix.md
Финальный checkpoint: tag final-project-submitted
В проекте показываю применение курса: AI coding workflow, rules/prompts, UI/ТЗ, frontend, backend, CI/CD, security и RAG.
```
