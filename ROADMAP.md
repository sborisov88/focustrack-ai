# Дорожная карта FocusTrack AI

Публичная дорожная карта описывает развитие продукта от продуктовой спецификации до MVP и публичного релиза.

## Текущий статус

На 17 июня 2026:

- Зафиксирована и реализована продуктовая и техническая спецификация MVP.
- Собран рабочий frontend на React, TypeScript, Vite и shadcn/ui.
- Зафиксирована и реализована backend-архитектура на Supabase, RLS, Edge Functions и OpenRouter.
- Подключены CI quality gate, Playwright e2e, скриншоты и видео основного сценария.
- Продукт задеплоен в production: `https://focustrack-ai.vercel.app`.

---

## Этап 1: Product specification

**Цель:** подготовить продуктовую и техническую основу MVP.

**Результат:**

- описание продукта, целевой аудитории и ключевых сценариев;
- user stories с приоритетами и acceptance criteria;
- техническая спецификация;
- ADR по стеку и архитектурным решениям;
- первые UI-концепции.

**Материалы:**

- `docs/product/project_description.md`
- `docs/product/user_stories.md`
- `docs/product/technical_specification.md`
- `docs/architecture/adr/001-tech-stack.md`
- `docs/product/ui_concepts/`

**Статус:** завершено.

## Этап 2: Frontend MVP

**Цель:** собрать рабочий интерфейс FocusTrack AI.

**Результат:**

- React + TypeScript + Vite приложение;
- экраны целей, задач и прогресса;
- дашборд с процентом выполнения и streak;
- UI для AI-уточнения цели и Weekly AI Review;
- базовая проверка качества интерфейса.

**Материалы:**

- `src/`
- `docs/frontend/development_report.md`

**Статус:** MVP реализован в корне Vite-приложения и проверен Playwright.

## Этап 3: Backend and AI functions

**Цель:** подключить хранилище данных, авторизацию и серверные AI-вызовы.

**Результат:**

- Supabase schema и миграции;
- Auth и RLS;
- Edge Functions для `ai-clarify`, `ai-plan`, `ai-weekly-review`;
- безопасная работа с OpenRouter через серверный слой;
- backend-документация и проверка ошибок.

**Материалы:**

- `supabase/migrations/`
- `supabase/functions/`
- `docs/backend/backend_architecture.md`
- `docs/backend/backend_documentation.md`
- `docs/security/security_audit.md`

**Статус:** миграции и Edge Functions реализованы, cloud database синхронизирована, smoke `health=200` и protected AI endpoint `401`.

## Этап 4: Knowledge/RAG

**Цель:** дать пользователю ответы по его личным заметкам и прогрессу.

**Результат:**

- сценарии, где пользователю полезны ответы по накопленным данным;
- минимальный эксперимент с заметками и историей прогресса;
- оценка качества, стоимости и рисков;
- решение о месте RAG в продукте.

**Материалы:**

- `docs/research/002-knowledge-rag/`

**Статус:** controlled RAG experiment подготовлен и оценён.

## Этап 5: Production

**Цель:** довести FocusTrack AI до публичного релиза.

**Результат:**

- финальная сборка продукта;
- демо-сценарий: цель → уточнение → план → выполнение → weekly review;
- CI/CD, OAuth, аналитика и аудит безопасности;
- Vercel production deploy.

**Материалы:**

- `docs/integrations/integration_documentation.md`
- `docs/production-deployment.md`
- `docs/progress/development_log.md`
- `docs/progress/release_notes.md`

**Статус:** продукт собран и задеплоен в production: `https://focustrack-ai.vercel.app`.
