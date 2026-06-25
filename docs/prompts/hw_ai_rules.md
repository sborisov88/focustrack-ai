# Описание проекта и стека для AI-агента

## Проект

**FocusTrack AI** — fullstack-продукт для отслеживания личных и рабочих целей с AI-планировщиком.

Пользователь формулирует цель, отвечает на уточняющие AI-вопросы, получает план на ближайшие недели, отмечает выполнение задач и раз в неделю получает AI-обзор прогресса по фактическим данным.

## Почему правила создаются под FocusTrack AI

FocusTrack AI развивается как единый продуктовый репозиторий. Основной AI coding assistant проекта — **Codex**, поэтому правила и промпт-шаблоны создаются не абстрактно, а под реальный рабочий процесс FocusTrack AI.

## Стек

| Слой                 | Выбор                                       |
| -------------------- | ------------------------------------------- |
| Frontend             | React, TypeScript, Vite, Tailwind, Recharts |
| Backend / DB / Auth  | Supabase Cloud, PostgreSQL, Auth, RLS       |
| AI layer             | Supabase Edge Functions, OpenRouter         |
| Development workflow | Codex, git, GitHub                          |
| Documentation        | Markdown, ADR, README, ROADMAP              |

## Ключевые требования к разработке

1. AI-вызовы не выполняются из браузера напрямую.
2. Секреты не попадают в git.
3. Supabase RLS считается обязательной частью backend-архитектуры.
4. Weekly AI Review входит в MVP.
5. Документация верхнего уровня должна выглядеть как продуктовая, а не как внутренний черновик.
6. Каждая значимая фаза должна оставлять проверяемые артефакты в репозитории.

## Как учтена официальная документация Codex

Официальная документация OpenAI описывает `AGENTS.md` как файл постоянных инструкций, который Codex читает перед началом работы и собирает в цепочку от глобального уровня к проектному. Поэтому для FocusTrack AI реальный rules-файл проекта — `AGENTS.md` в корне репозитория.

Отдельная страница Codex Rules относится к правилам разрешения команд (`prefix_rule`) и песочнице. Это не тот же механизм, что проектные rules для стиля кода и контекста продукта. Поэтому для FocusTrack AI фиксируем:

- проектные правила для агента: `AGENTS.md`;
- описание правил: `docs/prompts/rules.md`;
- `.rules` для разрешений команд не создаём, потому что в этой фазе не нужно менять политику команд.

## Источники по Codex

- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/learn/best-practices
- https://developers.openai.com/codex/prompting
- https://developers.openai.com/codex/rules
