# ADR-001: Технологический стек FocusTrack AI

| Поле | Значение |
|------|----------|
| **Статус** | Принято |
| **Дата** | 2026-06-17 |
| **Контекст** | MVP для ДЗ 1–6 и проектной работы курса Otus «ИИ-агенты» |

---

## Контекст и цель

FocusTrack AI — fullstack веб-приложение с AI-функциями (clarify, plan, weekly review).  
Нужен стек, который:

- закрывает критерии ДЗ 5 (БД, auth, API, RLS, e2e);
- закрывает ДЗ 6 (OAuth, CI/CD, аналитика);
- позволяет безопасно вызывать OpenRouter (ключи не на клиенте);
- укладывается в сроки одного человека на пути A.

## Решение

### Frontend

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| Framework | **React 18** | Требование/ориентир курса (занятие 15), экосистема |
| Язык | **TypeScript** | Типизация, меньше ошибок при работе с агентом |
| Сборка | **Vite** | Быстрый dev, простой CI |
| Стили | **Tailwind CSS** | Быстрая вёрстка, согласуется с v0.dev (ДЗ 3) |
| Графики | **Recharts** | Дашборд прогресса без тяжёлой кастомной отрисовки |
| Роутинг | **React Router** | Несколько экранов: dashboard, goal, review |
| Тесты | **Vitest + React Testing Library** | Критерий ДЗ 4: ≥3 автотеста |
| Supabase client | **@supabase/supabase-js** | CRUD + Auth + вызов Edge Functions |

### Backend / данные

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| BaaS | **Supabase Cloud** | Занятия 20–23; Auth + RLS + REST из коробки; меньше кода для ДЗ 5 |
| БД | **PostgreSQL** (в Supabase) | Реляционная модель: goals → tasks → completions |
| Миграции | **supabase/migrations/** | Воспроизводимый деплой (урок 21: не править только Dashboard) |
| Auth | **Supabase Auth** | Email + Google OAuth (ДЗ 6) |
| Безопасность | **RLS** | Каждый user_id видит только свои строки |

**Отклонено:** отдельный Express-сервер для CRUD — избыточно для MVP и выше риск не сдать ДЗ 5 в срок.

### AI-слой

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| LLM-провайдер | **OpenRouter** | Занятие 26; одна API-схема, выбор моделей |
| Вызов LLM | **Supabase Edge Functions** (Deno) | Секрет `OPENROUTER_API_KEY` только в Supabase secrets |
| Формат ответа | **JSON** (структурированный) | Контроль формата, снижение галлюцинаций |
| Модель (старт) | `openai/gpt-4o-mini` или аналог | Баланс цена/качество для structured output |

**Функции:**

| Edge Function | Назначение |
|---------------|------------|
| `ai-clarify` | Уточняющие вопросы по цели |
| `ai-plan` | Декомпозиция цели в этапы и задачи |
| `ai-weekly-review` | Отчёт по `task_completions` за 7 дней |
| `health` | Health check для ДЗ 6 |

**Отклонено:** вызов OpenRouter с клиента — утечка API-ключа.

**Отклонено на MVP:** RAG / pgvector — усложнение; weekly review работает на структурированных данных из PostgreSQL.

### DevOps и интеграции (ДЗ 6)

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| CI/CD | **GitHub Actions** | Критерий ДЗ 6 |
| Деплой frontend | **Vercel** или **Netlify** | Простой автодеплой из main |
| OAuth | **Google** (Supabase Auth) | Требование ДЗ 6 |
| Аналитика | **Яндекс.Метрика** | Требование ДЗ 6, курс (занятие 25) |
| Локальная разработка | **supabase CLI** (`supabase start`) | README «поднять с нуля» |
| Мониторинг | **UptimeRobot** + `/health` | Критерий ДЗ 6 |

### Инструменты разработки

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| IDE-агент | **Cursor** | Выбор ДЗ 1; rules, MCP при необходимости |
| Правила | **`.cursor/rules/focustrack-ai.mdc`** | ДЗ 2 |
| Репозиторий | **Один GitHub repo** | Путь A, [COURSE_HOMEWORK_MAP.md](../../../COURSE_HOMEWORK_MAP.md) |

---

## Схема архитектуры

```
┌─────────────┐     JWT      ┌──────────────────┐
│   React     │ ──────────►  │  Supabase Cloud  │
│  (Vite)     │ ◄──────────  │  PostgreSQL+RLS  │
└──────┬──────┘   REST/RPC  │  Auth            │
       │                      └────────┬─────────┘
       │ invoke (JWT)                   │
       ▼                                │
┌──────────────────┐                    │
│ Edge Functions   │ ───────────────────┘
│ clarify/plan/    │
│ weekly-review    │ ──────► OpenRouter API
└──────────────────┘
```

---

## Переменные окружения

### Frontend (`.env.local`, префикс `VITE_`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Supabase Edge Functions (secrets, не в git)

```
OPENROUTER_API_KEY=
```

### Пример в репозитории

Только `.env.example` с описанием полей, без значений.

---

## Последствия

### Плюсы

- Быстрый путь к e2e для ДЗ 5
- Auth и RLS без самописного backend
- OpenRouter изолирован на сервере
- Соответствует материалам курса (Supabase, OpenRouter, CI/CD)

### Минусы / риски

- RLS требует аккуратной настройки (типичная ошибка — пустые данные для anon)
- Edge Functions (Deno) — отдельный runtime от frontend
- Зависимость от Supabase Cloud и OpenRouter (доступность, лимиты)
- Cold start Edge Functions при редких вызовах

### Митигация

- Все политики RLS в миграциях + тест под двумя пользователями
- Таймаут и retry для OpenRouter; fallback-сообщение в UI
- Логирование в таблицу `ai_sessions`

---

## Критерии пересмотра ADR

Пересмотреть стек, если:

- OpenRouter недоступен → fallback на YandexGPT / Ollama (занятие 26)
- Edge Functions неудобны → тонкий FastAPI только для `/ai/*`, данные остаются в Supabase
- Требования проекта изменятся (например, обязательный RAG)

---

## Связанные документы

- [project_description.md](../project_description.md)
- [FOCUSTRACK_AI_WORK_PLAN.md](../FOCUSTRACK_AI_WORK_PLAN.md)
- [COURSE_HOMEWORK_MAP.md](../COURSE_HOMEWORK_MAP.md)

---

*Следующий ADR (при необходимости): ADR-002 — модель данных и RLS-политики*
