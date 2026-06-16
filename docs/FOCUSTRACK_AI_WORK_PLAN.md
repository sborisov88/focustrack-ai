# FocusTrack AI — план работ (ДЗ 1–6 + проектная работа)

> **Путь:** A (одна идея через все ДЗ → проект = доработка MVP + защита)  
> **Карта курса:** [COURSE_HOMEWORK_MAP.md](./COURSE_HOMEWORK_MAP.md)

---

## Зафиксированные решения

| Параметр | Выбор |
|----------|--------|
| **Продукт** | FocusTrack AI — трекер целей обучения/роста с AI-планировщиком |
| **Backend / БД / Auth** | **Supabase Cloud** (PostgreSQL, Auth, RLS) |
| **LLM** | **OpenRouter** (вызовы только с сервера — Edge Functions) |
| **Weekly AI Review** | **В MVP** (не Should have) |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind + Recharts |
| **AI-слой** | Supabase Edge Functions (`clarify`, `plan`, `weekly-review`) |
| **Репозиторий** | Один публичный GitHub-репозиторий на весь цикл |

### MVP FocusTrack AI (Must have)

1. **SMART-вход цели** — AI задаёт уточняющие вопросы (`/ai/clarify`)
2. **AI-декомпозиция** — цель → этапы → задачи на 2 недели (`/ai/plan`)
3. **Дашборд прогресса** — цели, задачи, % выполнения, streak
4. **Weekly AI Review** — отчёт по фактам за 7 дней + рекомендации (`/ai/weekly-review`)

### AI-цикл продукта (демо на защите)

```
Цель → Clarify (OpenRouter) → Plan → Выполнение задач → Weekly Review → (replan — nice have)
```

---

## Обязательное чтение перед работой

Перед **каждой фазой** перечитывать:

1. **[COURSE_HOMEWORK_MAP.md](./COURSE_HOMEWORK_MAP.md)** — связи ДЗ, артефакты, что идёт в проект
2. **`homework.md`** соответствующего ДЗ (или проекта) — критерии «Принято»
3. **`summary.md`** и **`qa.md`** связанных занятий — конспекты и ответы преподавателя

### Реестр материалов по фазам

| Фаза | homework.md | summary / qa |
|------|-------------|--------------|
| Старт | [28 — Проект](./28%20-%20Выбор%20темы%20и%20организация%20проектной%20работы%20Проект/homework.md) | `28 - …/summary.md`, `qa.md` |
| ДЗ 1 | [05 — ДЗ 1](./05%20-%20Российские%20LLM-решения%20(GigaCode,%20YandexGPT).%20OpenSource%20для%20On-premise%20решений%20(DeepSeek,%20Qwen)%20ДЗ/homework.md) | `03`, `04`, `05`, `06 — Q&A` |
| ДЗ 2 | [09 — ДЗ 2](./09%20-%20Практика%20промптинга.%20Проработка%20требований%20к%20приложению.%20Ресерч%20конкурентов%20ДЗ/homework.md) | `07`, `08`, `09` |
| ДЗ 3 | [13 — ДЗ 3](./13%20-%20Практика%20проработка%20требований%20с%20помощью%20AI-агента%20ДЗ/homework.md) | `10`, `12`, `13` |
| ДЗ 4 | [19 — ДЗ 4](./19%20-%20Live%20отладка%20Frontend%27а%20ДЗ/homework.md) | `15`, `17`, `18`, `19` |
| ДЗ 5 | [23 — ДЗ 5](./23%20-%20Live%20отладка%20Backend%27а%20ДЗ/homework.md) | `20`, `21`, `22`, `23` |
| ДЗ 6 | [27 — ДЗ 6](./27%20-%20Основы%20RAG%20Finetuning.%20Учим%20приложение%20отвечать%20по%20данным%20с%20документов%20ДЗ/homework.md) | `24`, `25`, `26` |
| Проект | [28 — Проект](./28%20-%20Выбор%20темы%20и%20организация%20проектной%20работы%20Проект/homework.md) | `28`, `29` |
| AI в продукте | — | `26 — OpenRouter`, `27 — RAG` (контекст, не обязательно RAG в MVP) |

> **Правило:** не начинать фазу, пока не сверился с `homework.md` этой фазы и критериями «Принято».

---

## Структура репозитория (эволюция)

```
focustrack-ai/
├── README.md
├── .env.example
├── .cursor/rules/
│   └── focustrack-ai.mdc
├── docs/
│   ├── project_description.md
│   ├── user_stories.md
│   ├── technical_specification.md
│   ├── ui_concepts/
│   ├── adr/
│   │   └── 001-tech-stack.md
│   ├── hw1-tool-analysis/
│   ├── hw2-prompts/
│   ├── development_report.md
│   ├── backend_documentation.md
│   ├── integration_documentation.md
│   ├── security_audit.md
│   └── prompts/                    # ключевые промпты для защиты
├── frontend/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── ai-clarify/
│   │   ├── ai-plan/
│   │   ├── ai-weekly-review/
│   │   └── health/
│   └── config.toml
├── .github/workflows/
│   └── ci.yml
└── presentation/                   # опционально
```

---

## Фаза 0 — Старт (до ДЗ 1)

**Прочитать:** `COURSE_HOMEWORK_MAP.md`, `28 - …/homework.md`, `summary.md`, `qa.md`

### Задачи

- [ ] Создать GitHub-репозиторий `focustrack-ai`
- [ ] Написать `docs/project_description.md` (проблема, ЦА, 4 функции MVP, стек)
- [ ] Отправить **тему FocusTrack AI** в чат проектного задания Otus ([47773](https://otus.ru/learning/493766/#/homework-chat/47773/))
- [ ] Создать проект **Supabase Cloud** (записать URL, anon key — не в git)
- [ ] Получить API-ключ **OpenRouter** (только для Edge Functions secrets)
- [ ] Установить **Cursor**, настроить рабочее окружение
- [ ] `git tag` или ветка `phase-0-init` после первого коммита

### Артефакт

`docs/project_description.md` + ссылка на репозиторий в чате проекта

---

## Фаза 1 — ДЗ 1: Выбор AI-инструмента

**Сдать:** [Otus 47733](https://otus.ru/learning/493766/#/homework-chat/47733/)

**Прочитать:** `05 - …/homework.md`, `03–06 summary/qa`, `COURSE_HOMEWORK_MAP.md`

### Задачи

- [ ] Задача для сравнения = **FocusTrack AI** (`docs/hw1-tool-analysis/requirements.md`)
- [ ] Таблица: ≥2 Cloud + ≥2 IDE (Cursor, Cline, Copilot, Bolt, Lovable…)
- [ ] Критерии: контекст, скорость, качество, стоимость, безопасность, интеграция
- [ ] Выбрать **Cursor** — обосновать под brownfield + Supabase + monorepo
- [ ] Практика: маленькая задача в репо (например, scaffold `README` или ADR)
- [ ] Отчёт: `docs/hw1-tool-analysis/report.md` + таблица

### Сдача

Прикрепить файлы на Otus **или** ссылку на `docs/hw1-tool-analysis/` (не обязательно весь репо)

### Критерии самопроверки

- [ ] 6 шагов выполнены
- [ ] ≥4 инструмента в таблице
- [ ] Cursor установлен, есть скриншот/пример работы

---

## Фаза 2 — ДЗ 2: Rules и промпт-шаблоны

**Сдать:** [Otus 47734](https://otus.ru/learning/493766/#/homework-chat/47734/)

**Прочитать:** `09 - …/homework.md`, `07–08 summary`, `COURSE_HOMEWORK_MAP.md`

### Задачи

- [ ] `.cursor/rules/focustrack-ai.mdc` — ≥10 правил (Role, Context, Style, Constraints, Format)
- [ ] Constraints: стек React+Supabase+OpenRouter; не менять без ADR; не хардкодить секреты
- [ ] `docs/hw2-prompts/prompt_templates.md` — ≥5 шаблонов RTCF:
  - генерация компонента
  - рефакторинг
  - тесты
  - исправление бага
  - декомпозиция задачи
  - **+ шаблон для Edge Function (AI adapter)**
- [ ] Chain-of-Thought: одна сложная задача (например, схема БД FocusTrack AI) → `prompt_methodology.md`
- [ ] A/B тест rules: `testing.md` (код до/после)

### Сдача

`docs/hw2-prompts/*` на Otus или ZIP

### Критерии самопроверки

- [ ] ≥10 rules, ≥5 шаблонов RTCF, CoT задокументирован, видно улучшение с rules

---

## Фаза 3 — ДЗ 3: ТЗ, UI, User Stories

**Сдать:** [Otus 47735](https://otus.ru/learning/493766/#/homework-chat/47735/)

**Прочитать:** `13 - …/homework.md`, `10–13 summary`, `COURSE_HOMEWORK_MAP.md`

### Задачи

- [ ] `docs/project_description.md` — доработать до 1–2 страниц
- [ ] `docs/ui_concepts/` — ≥3 концепции (v0.dev): минимализм, dashboard-heavy, mobile-first
- [ ] `docs/ui_concepts/ui_description.md` — обоснование выбора
- [ ] `docs/user_stories.md` — ≥5 stories, Must/Should/Nice, Given-When-Then
- [ ] `docs/technical_specification.md`:
  - сущности: `goals`, `tasks`, `task_completions`, `ai_sessions`, `weekly_reviews`
  - API: Supabase CRUD + Edge Functions AI
  - обработка ошибок (сеть, LLM timeout, пустые данные, неавторизованный доступ)
- [ ] `docs/adr/001-tech-stack.md` — Supabase Cloud + OpenRouter + Edge Functions
- [ ] AI: «задай уточняющие вопросы» перед финальным ТЗ

### Must-have stories (минимум)

1. Создать цель + AI clarify  
2. Получить AI-план с задачами  
3. Отмечать задачи, видеть прогресс на дашборде  
4. Запустить Weekly AI Review  
5. *(Should)* Google OAuth вход  

### Сдача

4 файла/папки на Otus по формату ДЗ 3

### Критерии самопроверки

- [ ] ≥3 UI-концепции, ≥5 stories, ≥3 типа ошибок, ТЗ готово для AI-инженера

---

## Фаза 4 — ДЗ 4: Frontend

**Сдать:** [Otus 47736](https://otus.ru/learning/493766/#/homework-chat/47736/)

**Прочитать:** `19 - …/homework.md`, `15–19 summary`, `COURSE_HOMEWORK_MAP.md`

### Задачи

- [ ] Scaffold `frontend/` (Vite + React + TS + Tailwind + React Router)
- [ ] Применить rules из ДЗ 2
- [ ] Страницы:
  - `/` — дашборд (цели, прогресс, streak)
  - `/goals/new` — создание цели + clarify flow (mock → потом API)
  - `/goals/:id` — детали цели, список задач
  - `/review` — Weekly Review (кнопка + отображение результата)
- [ ] Компоненты: GoalCard, TaskList, ProgressChart (Recharts), Loading/Error states
- [ ] `frontend/src/mocks/` — mock под схему Supabase (для проверки до ДЗ 5)
- [ ] Адаптивная вёрстка (mobile + desktop)
- [ ] ≥3 теста (Vitest + RTL): GoalCard, TaskList, error state
- [ ] `docs/development_report.md` — промпты, проблемы, скриншоты

### Сдача

Ссылка на GitHub-репозиторий

### Критерии самопроверки

- [ ] `npm run dev` работает, ≥3 функции из ТЗ, адаптивность, ≥3 теста проходят

---

## Фаза 5 — ДЗ 5: Supabase + e2e + AI Edge Functions

**Сдать:** [Otus 47737](https://otus.ru/learning/493766/#/homework-chat/47737/)

**Прочитать:** `23 - …/homework.md`, `20–23 summary`, `26 summary` (AI-адаптер), `COURSE_HOMEWORK_MAP.md`

### 5.1 Схема БД и RLS

```sql
-- goals (user_id, title, description, status, target_date, clarified_context jsonb)
-- tasks (goal_id, title, effort S/M/L, due_date, status, sort_order)
-- task_completions (task_id, completed_at, note)
-- ai_sessions (goal_id, type: clarify|plan|review, input jsonb, output jsonb)
-- weekly_reviews (user_id, week_start, summary, recommendations jsonb)
```

- [ ] Миграции в `supabase/migrations/`
- [ ] RLS: пользователь видит/меняет **только свои** строки
- [ ] Индексы на `user_id`, `goal_id`

### 5.2 Supabase Auth

- [ ] Email/password или magic link (минимум)
- [ ] Подготовка к Google OAuth (ДЗ 6)

### 5.3 Edge Functions + OpenRouter

| Function | Назначение |
|----------|------------|
| `ai-clarify` | Уточняющие вопросы по цели |
| `ai-plan` | Декомпозиция после ответов пользователя |
| `ai-weekly-review` | Анализ `task_completions` за 7 дней → summary + 3 рекомендации |
| `health` | Health check для ДЗ 6 |

- [ ] System prompt: роль coach, JSON-ответ, лимит токенов, запрет injection
- [ ] Секрет `OPENROUTER_API_KEY` только в Supabase secrets
- [ ] Логирование ошибок LLM в `ai_sessions`

### 5.4 Интеграция Frontend

- [ ] `@supabase/supabase-js` — заменить mocks
- [ ] Auth flow на frontend
- [ ] Вызов Edge Functions с JWT пользователя
- [ ] Обработка 401/403/500, LLM timeout

### 5.5 Документация

- [ ] `docs/backend_documentation.md` — схема, RLS, Edge Functions, curl-примеры

### Сдача

Ссылка на GitHub, e2e работает

### Критерии самопроверки

- [ ] CRUD целей/задач, auth, RLS, 3 AI-функции + weekly review, e2e, документация

---

## Фаза 6 — ДЗ 6: CI/CD, OAuth, аналитика, security

**Сдать:** [Otus 47738](https://otus.ru/learning/493766/#/homework-chat/47738/)

**Прочитать:** `27 - …/homework.md`, `24–25 summary`, `COURSE_HOMEWORK_MAP.md`

### Задачи

- [ ] `.github/workflows/ci.yml`:
  - lint + test (frontend)
  - build frontend
  - (опционально) deploy Vercel/Netlify
- [ ] **OAuth2:** Google через Supabase Auth
- [ ] **Яндекс.Метрика** на frontend (события: create_goal, complete_task, weekly_review)
- [ ] `docs/security_audit.md` — npm audit, OWASP checklist, исправления
- [ ] `docs/integration_documentation.md` — CI/CD, OAuth, Metrika, health
- [ ] Мониторинг: UptimeRobot на URL frontend + health endpoint
- [ ] `README.md` — clone → install → run за ≤5 команд

### Сдача

Ссылка на репозиторий + работающий деплой или локальный compose

### Критерии самопроверки

- [ ] CI зелёный, ≥2 интеграции (OAuth + Metrika), audit, health, документация

---

## Фаза 7 — Проектная работа: доработка + защита

**Сдать:** [Otus 47773](https://otus.ru/learning/493766/#/homework-chat/47773/)  
**Защита:** ~10 минут (целевая дата — 17 июня)

**Прочитать:** `28 - …/homework.md`, `summary.md`, `qa.md`, `29 - …/summary.md`, `COURSE_HOMEWORK_MAP.md`

### Доработка MVP (если не готово)

- [ ] Полный AI-цикл: clarify → plan → tasks → weekly review (live demo)
- [ ] Шаблон цели «Курс AI-агентов Otus» (встроенный demo для комиссии)
- [ ] `docker compose` или `supabase start` + `npm run dev` в README
- [ ] Overload Guard / Replan — nice have, если останется время

### Артефакты защиты

- [ ] `docs/architecture.md` — Mermaid: Frontend ↔ Supabase ↔ Edge Functions ↔ OpenRouter
- [ ] `docs/prompts/` — 2–3 ключевых промпта (clarify, plan, weekly-review)
- [ ] `presentation/` или Google Slides (~10 мин)
- [ ] Репозиторий отправлен преподавателю **заранее**

### Структура выступления (10 мин)

| Мин | Блок |
|-----|------|
| 2 | Проблема, ЦА, ценность FocusTrack AI |
| 3 | Live demo: цель → clarify → plan → задача → weekly review |
| 2 | Архитектура: Supabase + Edge Functions + OpenRouter |
| 2 | AI в разработке: Cursor, rules, примеры промптов |
| 1 | Выводы, next steps (replan, RAG по истории целей) |

### Критерии самопроверки

- [ ] MVP запускается с нуля по README
- [ ] Все 6 ДЗ сданы (или в процессе)
- [ ] Демо не падает на happy path
- [ ] Показано применение курса, не только папка отчётов

---

## Сводная таблица: фаза → сдача → артефакт

| Фаза | Otus | Главный артефакт | В репозитории |
|------|------|------------------|---------------|
| 0 | Проект (тема) | Тема в чате | `docs/project_description.md` |
| 1 | 47733 | Отчёт + таблица | `docs/hw1-tool-analysis/` |
| 2 | 47734 | Rules + шаблоны | `docs/hw2-prompts/`, `.cursor/rules/` |
| 3 | 47735 | ТЗ + UI + stories | `docs/technical_specification.md`, `ui_concepts/` |
| 4 | 47736 | Frontend + тесты | `frontend/`, `development_report.md` |
| 5 | 47737 | Supabase + AI + e2e | `supabase/`, `backend_documentation.md` |
| 6 | 47738 | CI/CD + интеграции | `.github/workflows/`, `security_audit.md` |
| 7 | 47773 | Защита MVP | `README`, `architecture.md`, presentation |

---

## Рекомендуемый порядок (не пропускать зависимости)

```
Фаза 0 → ДЗ 1 → ДЗ 2 → ДЗ 3 → ДЗ 4 → ДЗ 5 → ДЗ 6 → Проект
           ↑       ↑       ↑       ↑       ↑       ↑
         тема   rules    ТЗ    mock→UI  Supabase  CI/CD
```

**Не начинать ДЗ 4** без готового `technical_specification.md` (ДЗ 3).  
**Не начинать ДЗ 5** без работающего frontend с mocks (ДЗ 4).  
**Не начинать ДЗ 6** без e2e (ДЗ 5).

---

## Риски и митигация

| Риск | Митигация |
|------|-----------|
| RLS блокирует данные | Тестировать anon vs authenticated; миграции, не Dashboard |
| OpenRouter timeout | Retry + fallback сообщение в UI; лог в `ai_sessions` |
| Weekly Review галлюцинирует | System prompt: «только факты из переданного JSON» |
| CI падает | Починить до сдачи ДЗ 6 — обязательный критерий |
| Не успеваешь | Сузить nice-have (replan, RAG); core 4 функции — не трогать |

---

## Чеклист «перед каждой сдачей»

- [ ] Перечитан `homework.md` этой фазы
- [ ] Перечитан `summary.md` / `qa.md` связанных занятий
- [ ] Сверка с `COURSE_HOMEWORK_MAP.md`
- [ ] Все критерии «Принято» из homework.md отмечены
- [ ] Секреты не в git (только `.env.example`)
- [ ] Коммит + tag `hw{N}-submitted` (опционально)

---

*Документ создан для проекта FocusTrack AI. Обновлять по мере прохождения фаз.*
