# FocusTrack AI Roadmap

Публичная дорожная карта описывает развитие одного продукта от исследования рабочего процесса до MVP и финальной презентации.

## Milestone 1: AI Tooling

**Цель:** выбрать основной AI coding assistant для разработки FocusTrack AI.

**Результат:**

- требования к инструменту разработки;
- сравнение Codex, Cursor, GitHub Copilot, Cline и cloud-инструментов;
- обоснование выбора Codex;
- пример практической работы агента с кодом.

**Статус:** завершено.

**Материалы:** [docs/research/001-ai-tooling/](./docs/research/001-ai-tooling/)

## Milestone 2: Prompting Workflow

**Цель:** описать устойчивый процесс работы с AI-агентом.

**План:**

- правила для агента в контексте FocusTrack AI;
- промпт-шаблоны для компонентов, рефакторинга, тестов, исправления ошибок и Edge Functions;
- методология сложных запросов;
- журнал проверки качества промптов.

**Ожидаемые материалы:**

- `docs/prompts/agent_rules.md`
- `docs/prompts/prompt_templates.md`
- `docs/prompts/prompt_methodology.md`
- `docs/prompts/testing.md`

## Milestone 3: Product Specification

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

## Milestone 4: Frontend MVP

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

## Milestone 5: Backend and AI Functions

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
- `docs/backend/backend_report.md`
- `docs/architecture/security.md`

## Milestone 6: Knowledge/RAG Experiments

**Цель:** проверить, нужен ли продукту слой ответов по данным и документам.

**План:**

- определить сценарии, где пользователю полезны ответы по накопленным данным;
- подготовить минимальный эксперимент с документами или историей прогресса;
- оценить качество, стоимость и риски;
- решить, входит ли RAG в MVP или остаётся будущим улучшением.

**Ожидаемые материалы:**

- `docs/research/002-knowledge-rag/`

## Final: MVP and Presentation

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
