# Дорожная карта FocusTrack AI

Публичная дорожная карта описывает развитие одного продукта от исследования рабочего процесса до MVP и финальной презентации.

## Текущий статус

На 17 июня 2026:

- Завершён выбор AI coding assistant.
- Правила Codex, промпт-шаблоны, методология и A/B-проверка качества правил отправлены на проверку.
- Зафиксирована backend-архитектура на Supabase, RLS, Edge Functions и OpenRouter.
- Основной AI coding assistant проекта — **Codex**.
- Следующий продуктовый этап — описание продукта, user stories, техническая спецификация и первые UI-концепции.

---

## Этап 1: AI tooling

**Цель:** выбрать основной AI coding assistant для разработки FocusTrack AI.

**Результат:**

- требования к инструменту разработки;
- сравнение Codex, Cursor, GitHub Copilot, Cline и cloud-инструментов;
- обоснование выбора Codex;
- пример практической работы агента с кодом.

**Статус:** завершено и отправлено.

**Материалы:** [docs/research/001-ai-tooling/](./docs/research/001-ai-tooling/)

## Этап 2: prompting workflow

**Цель:** описать устойчивый процесс работы с Codex в проекте FocusTrack AI.

**Результат:**

- правила для Codex в контексте FocusTrack AI;
- 7 промпт-шаблонов RTCF для компонентов, рефакторинга, тестов, исправления ошибок, декомпозиции, Edge Functions и проверки публичной документации;
- методология сложных запросов;
- A/B-проверка качества ответа до и после правил.

**Материалы:**

- `AGENTS.md`
- `docs/prompts/hw_ai_rules.md`
- `docs/prompts/rules.md`
- `docs/prompts/prompt_templates.md`
- `docs/prompts/prompt_methodology.md`
- `docs/prompts/testing.md`

**Статус:** отправлено на проверку 17 июня 2026.

## Этап 3: Product specification

**Цель:** подготовить продуктовую и техническую основу MVP.

**План:**

- описание продукта, целевой аудитории и ключевых сценариев;
- user stories с приоритетами и acceptance criteria;
- техническая спецификация;
- ADR по стеку и архитектурным решениям;
- первые UI-концепции.

**Ожидаемые материалы:**

- `docs/product/project_description.md`
- `docs/product/user_stories.md`
- `docs/product/technical_specification.md`
- `docs/architecture/adr/001-tech-stack.md`
- `docs/product/ui_concepts/`

**Статус:** следующий этап.

## Этап 4: Frontend MVP

**Цель:** собрать рабочий интерфейс FocusTrack AI.

**План:**

- React + TypeScript + Vite приложение;
- экраны целей, задач и прогресса;
- дашборд с процентом выполнения и streak;
- UI для AI-уточнения цели и Weekly AI Review;
- базовая проверка качества интерфейса.

**Ожидаемые материалы:**

- `frontend/`
- `docs/frontend/frontend_report.md`

## Этап 5: Backend and AI functions

**Цель:** подключить хранилище данных, авторизацию и серверные AI-вызовы.

**План:**

- Supabase schema и миграции;
- Auth и RLS;
- Edge Functions для `ai-clarify`, `ai-plan`, `ai-weekly-review`;
- безопасная работа с OpenRouter через серверный слой;
- backend-документация и проверка ошибок.

**Ожидаемые материалы:**

- `supabase/migrations/`
- `supabase/functions/`
- `docs/backend/backend_architecture.md`
- `docs/backend/backend_report.md`
- `docs/architecture/security.md`

## Этап 6: Knowledge/RAG experiments

**Цель:** проверить, нужен ли продукту слой ответов по данным и документам.

**План:**

- определить сценарии, где пользователю полезны ответы по накопленным данным;
- подготовить минимальный эксперимент с документами или историей прогресса;
- оценить качество, стоимость и риски;
- решить, входит ли RAG в MVP или остаётся будущим улучшением.

**Ожидаемые материалы:**

- `docs/research/002-knowledge-rag/`

## Финал: MVP and presentation

**Цель:** довести FocusTrack AI до демонстрируемого MVP.

**План:**

- финальная сборка продукта;
- демо-сценарий: цель → уточнение → план → выполнение → weekly review;
- проверка README, roadmap, документации и репозитория;
- краткая презентация продукта, архитектуры и результатов.

**Ожидаемые материалы:**

- `docs/progress/development_log.md`
- `docs/progress/release_notes.md`
- `presentation/`
