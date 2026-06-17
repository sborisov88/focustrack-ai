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

Фактический smoke 17 июня 2026:

```text
lint/typecheck/unit/build/audit/e2e -> pass
Vercel production frontend -> 200
GitHub Actions CI + Vercel deploy -> success, run 27682163117
GET /functions/v1/health -> 200
POST /functions/v1/ai-weekly-review без JWT -> 401
Playwright screenshots/video -> output/playwright/ и output/playwright/production/
```

Повторная сверка требований: `submissions/reverification-audit-2026-06-17.md`.

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
| Presentation outline | `presentation/README.md`                  |
| Evidence             | `output/playwright/`, `output/playwright/production/` |

## Текст для отправки темы/проекта

```text
Добрый день! Тема проектной работы: FocusTrack AI.

Это веб-приложение — AI-планировщик личных и рабочих целей с AI-уточнением, AI-планом задач, дашбордом прогресса, еженедельным AI-ревью и ответами по личным заметкам (RAG).
Примеры целей: «Пробежать первый полумарафон», «Сдать IELTS на 7.0», «Сформировать подушку безопасности на 6 месяцев», «Запустить лендинг пет-проекта».
Стек: React, TypeScript, shadcn/ui, Supabase Cloud, PostgreSQL, RLS, Supabase Edge Functions, OpenRouter.
Production URL: https://focustrack-ai.vercel.app
В проекте показываю применение курса: AI coding workflow, rules/prompts, UI/ТЗ, frontend, backend, CI/CD, security и RAG.
```
