# FocusTrack AI

**FocusTrack AI** — fullstack-продукт для отслеживания целей обучения и профессионального роста с AI-планировщиком.

Продукт помогает сформулировать цель, уточнить её через AI-вопросы, разложить на этапы и задачи, отслеживать прогресс и получать еженедельный AI-обзор по фактическим данным.

## Статус

Проект находится на ранней стадии: зафиксирована идея продукта, выбран основной AI coding assistant, подготовлены первые проектные материалы, правила работы Codex и пример кода для доменной логики прогресса.

## MVP

1. SMART-вход цели с AI-уточнением.
2. AI-декомпозиция цели в этапы и задачи.
3. Дашборд прогресса: цели, задачи, процент выполнения, streak.
4. Weekly AI Review по фактическим данным за неделю.

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | React, TypeScript, Vite, Tailwind, Recharts |
| Backend / DB / Auth | Supabase Cloud, PostgreSQL, Auth, RLS |
| AI-слой | Supabase Edge Functions, OpenRouter |
| Разработка | Codex, git, GitHub |

## Дорожная карта

Публичная дорожная карта проекта находится в [ROADMAP.md](./ROADMAP.md).

Коротко:

1. **Milestone 1: AI tooling** — выбор и настройка AI coding assistant.
2. **Milestone 2: Prompting workflow** — правила, промпт-шаблоны и методология работы с агентом.
3. **Milestone 3: Product specification** — описание продукта, user stories, техническая спецификация и ADR.
4. **Milestone 4: Frontend MVP** — интерфейс, дашборд, состояние и пользовательские сценарии.
5. **Milestone 5: Backend and AI functions** — Supabase, RLS, Edge Functions, OpenRouter.
6. **Milestone 6: Knowledge/RAG experiments** — эксперименты с ответами по данным и документам.
7. **Final: MVP and presentation** — финальная сборка, демо и материалы для защиты продукта.

## Документация

| Раздел | Содержание |
|--------|------------|
| [docs/research/001-ai-tooling/report.md](./docs/research/001-ai-tooling/report.md) | Итоговый отчёт по выбору AI-инструмента |
| [docs/research/001-ai-tooling/comparison_table.md](./docs/research/001-ai-tooling/comparison_table.md) | Сравнение AI coding assistants и cloud-инструментов |
| [docs/research/001-ai-tooling/tool_selection.md](./docs/research/001-ai-tooling/tool_selection.md) | Обоснование выбора Codex |
| [docs/research/001-ai-tooling/setup_guide.md](./docs/research/001-ai-tooling/setup_guide.md) | Настройка рабочего окружения |
| [docs/research/001-ai-tooling/practice_log.md](./docs/research/001-ai-tooling/practice_log.md) | Журнал практической работы |
| [docs/research/001-ai-tooling/practice/](./docs/research/001-ai-tooling/practice/) | Пример кода, созданный с помощью AI-агента |
| [AGENTS.md](./AGENTS.md) | Проектные инструкции для Codex |
| [docs/prompts/](./docs/prompts/) | Rules, промпт-шаблоны и методология работы с AI-агентом |
| [docs/backend/backend_architecture.md](./docs/backend/backend_architecture.md) | Архитектура backend-а и AI-функций |

## Текущий выбор AI-инструмента

Для FocusTrack AI выбран **Codex** как основной AI coding assistant. По возможностям он находится на одном уровне с Cursor: оба инструмента подходят для локального репозитория, git, терминала, многофайловых правок и агентного цикла разработки. Решающим фактором стала стоимость: Codex уже включён в подписку ChatGPT, поэтому не требует отдельной оплаты за ещё одну IDE-подписку.

## Правила работы с AI-агентом

Проектные правила для Codex находятся в [AGENTS.md](./AGENTS.md). Это основной файл постоянных инструкций для выбранного AI coding assistant. Промпт-шаблоны и методология работы с агентом находятся в [docs/prompts/](./docs/prompts/).
