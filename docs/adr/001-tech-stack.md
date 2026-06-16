# ADR-001: Технологический стек FocusTrack AI

| Поле | Значение |
|------|----------|
| **Статус** | Принято |
| **Дата** | 2026-06-17 |
| **Контекст** | MVP FocusTrack AI — fullstack-приложение с AI-функциями |

---

## Контекст и цель

FocusTrack AI — fullstack веб-приложение с AI-функциями (clarify, plan, weekly review).  
Нужен стек, который:

- обеспечивает auth, API, RLS и e2e-сценарии;
- поддерживает OAuth, CI/CD и мониторинг;
- позволяет безопасно вызывать OpenRouter (ключи не на клиенте);
- укладывается в сроки разработки MVP одним разработчиком.

## Решение

### Frontend

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| Framework | **React 18** | Зрелая экосистема, удобен для SPA |
| Язык | **TypeScript** | Типизация, меньше ошибок при работе с агентом |
| Сборка | **Vite** | Быстрый dev, простой CI |
| Стили | **Tailwind CSS** | Быстрая вёрстка, согласуется с v0.dev |
| Графики | **Recharts** | Дашборд прогресса без тяжёлой кастомной отрисовки |
| Роутинг | **React Router** | Несколько экранов: dashboard, goal, review |
| Тесты | **Vitest + React Testing Library** | Автотесты ключевых UI-сценариев |
| Supabase client | **@supabase/supabase-js** | CRUD + Auth + вызов Edge Functions |

### Backend / данные

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| BaaS | **Supabase Cloud** | Auth + RLS + REST из коробки, меньше самописного backend |
| БД | **PostgreSQL** (в Supabase) | Реляционная модель: goals → tasks → completions |
| Миграции | **supabase/migrations/** | Воспроизводимый деплой, версионирование схемы |
| Auth | **Supabase Auth** | Email + Google OAuth |
| Безопасность | **RLS** | Каждый user_id видит только свои строки |

**Отклонено:** отдельный Express-сервер для CRUD — избыточно для MVP.

### AI-слой

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| LLM-провайдер | **OpenRouter** | Одна API-схема, выбор моделей |
| Вызов LLM | **Supabase Edge Functions** (Deno) | Секрет `OPENROUTER_API_KEY` только в Supabase secrets |
| Формат ответа | **JSON** (структурированный) | Контроль формата, снижение галлюцинаций |
| Модель (старт) | `openai/gpt-4o-mini` или аналог | Баланс цена/качество для structured output |

**Функции:**

| Edge Function | Назначение |
|---------------|------------|
| `ai-clarify` | Уточняющие вопросы по цели |
| `ai-plan` | Декомпозиция цели в этапы и задачи |
| `ai-weekly-review` | Отчёт по `task_completions` за 7 дней |
| `health` | Health check для мониторинга |

**Отклонено:** вызов OpenRouter с клиента — утечка API-ключа.

**Отклонено на MVP:** RAG / pgvector — усложнение; weekly review работает на структурированных данных из PostgreSQL.

### DevOps и интеграции

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| CI/CD | **GitHub Actions** | Автотесты и проверки на каждый PR |
| Деплой frontend | **Vercel** или **Netlify** | Простой автодеплой из main |
| OAuth | **Google** (Supabase Auth) | Быстрый вход без пароля |
| Аналитика | **Яндекс.Метрика** | Поведение пользователей в production |
| Локальная разработка | **supabase CLI** (`supabase start`) | README «поднять с нуля» |
| Мониторинг | **UptimeRobot** + `/health` | Алерты при недоступности |

### Инструменты разработки

| Компонент | Выбор | Обоснование |
|-----------|--------|-------------|
| IDE-агент | **Cursor** | Ускорение разработки, rules, MCP при необходимости |
| Правила | **`.cursor/rules/focustrack-ai.mdc`** | Единые соглашения для агента и команды |
| Репозиторий | **Один GitHub repo** | Frontend, Supabase и документация в одном месте |

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

- Быстрый путь к end-to-end MVP
- Auth и RLS без самописного backend
- OpenRouter изолирован на сервере
- Проверенный стек: Supabase, OpenRouter, GitHub Actions

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

- OpenRouter недоступен → fallback на YandexGPT / Ollama
- Edge Functions неудобны → тонкий FastAPI только для `/ai/*`, данные остаются в Supabase
- Требования проекта изменятся (например, обязательный RAG)

---

## Связанные документы

- [project_description.md](../project_description.md)

---

*Следующий ADR (при необходимости): ADR-002 — модель данных и RLS-политики*
