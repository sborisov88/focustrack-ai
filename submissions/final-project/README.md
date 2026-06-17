# Проектная работа — FocusTrack AI

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47773/

## Тема

FocusTrack AI — трекер учебных и профессиональных целей с AI-планированием, прогрессом и weekly review.

## MVP

1. SMART-вход цели.
2. AI-уточнение и план.
3. Дашборд прогресса.
4. Weekly AI Review.
5. Supabase backend.
6. OpenRouter через JWT-protected Edge Functions.
7. RAG experiment по документам.

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

Проверочный сценарий:

1. открыть дашборд;
2. создать цель;
3. отметить задачу;
4. запустить AI Review;
5. показать Supabase migration/RLS/functions;
6. показать Playwright evidence.

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

Это веб-приложение для ведения учебных и профессиональных целей с AI-планировщиком, дашбордом прогресса и weekly review.
Стек: React, TypeScript, shadcn/ui, Supabase Cloud, PostgreSQL, RLS, Supabase Edge Functions, OpenRouter.
Production URL: https://focustrack-ai.vercel.app
В проекте показываю применение курса: AI coding workflow, rules/prompts, UI/TЗ, frontend, backend, CI/CD, security и RAG experiment.
```
