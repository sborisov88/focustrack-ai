# Техническое задание FocusTrack AI

## 1. Назначение

Реализовать fullstack MVP FocusTrack AI: веб-приложение для ведения личных и рабочих целей с AI-уточнением, планированием, прогрессом и weekly review.

Демонстрационный workspace показывает четыре жизненные цели: «Пробежать первый полумарафон», «Сдать IELTS на 7.0», «Сформировать подушку безопасности на 6 месяцев», «Запустить лендинг пет-проекта».

Целевая аудитория MVP — специалисты, фрилансеры и продакт-ориентированные пользователи, которым нужно вести долгие личные или рабочие цели без отдельного корпоративного таск-трекера.

Frontend-стек: React, TypeScript, Vite, shadcn/ui, Tailwind CSS и Recharts. UI должен работать как single-page application с History API-маршрутами `/dashboard`, `/planner`, `/knowledge`, `/review` и строгим 404-состоянием для неизвестных путей.

## 2. Функциональные требования

### FR-01. Создание цели

Пользователь должен иметь возможность создать цель с названием, описанием и дедлайном.

Данные:

- `title` — строка, минимум 3 символа;
- `description` — контекст цели;
- `target_date` — дата;
- `status` — `draft | active | paused | completed`.

### FR-02. Управление задачами

Пользователь должен видеть задачи выбранной цели и менять статус задачи через чекбокс.

Статусы:

- `todo`;
- `doing`;
- `done`;
- `blocked`.

После изменения статуса пересчитывается `progress_percent` цели.

### FR-03. AI-уточнение цели

Edge Function `ai-clarify` принимает черновик цели и возвращает вопросы, которые помогают сделать цель SMART.

### FR-04. AI-план

Edge Function `ai-plan` принимает цель и контекст, вызывает OpenRouter и возвращает план задач на ближайшие две недели.

### FR-05. Weekly AI Review

Edge Function `ai-weekly-review` принимает факты недели: выполненные задачи, блокеры и прогресс. Ответ модели сохраняется как AI-сессия и отображается в UI.

### FR-06. Knowledge/RAG эксперимент

Frontend сохраняет личные заметки в `knowledge_documents`, а Edge Function `embed-knowledge-document` создаёт `knowledge_chunks` с embeddings. Edge Function `rag-answer` принимает `{question, selectedDocumentId?}`, строит embedding вопроса, вызывает RPC `match_knowledge_chunks` и передаёт модели только найденные пользовательские chunks.

### FR-07. OAuth

Frontend содержит кнопку Google OAuth через Supabase Auth. Секреты провайдера не хранятся во frontend.

### FR-08. Аналитика

Frontend содержит `trackEvent`, который может отправлять события в Яндекс.Метрику при наличии `VITE_YANDEX_METRIKA_ID` и `window.ym`.

## 3. Нефункциональные требования

| Категория     | Требование                                             |
| ------------- | ------------------------------------------------------ |
| Безопасность  | OpenRouter API key хранится только в Supabase secrets  |
| Доступ        | Все пользовательские таблицы защищены RLS              |
| UX            | MVP работает в демо-режиме без входа                   |
| Надёжность    | Edge Functions возвращают безопасные ошибки            |
| Проверяемость | Есть unit-тесты и Playwright e2e                       |
| Адаптивность  | Десктопный и мобильный viewport проверяются Playwright |

## 4. Модель данных

Основные таблицы:

- `profiles`;
- `goals`;
- `tasks`;
- `task_completions`;
- `ai_sessions`;
- `weekly_reviews`;
- `knowledge_documents`;
- `knowledge_chunks`;
- `knowledge_answers`.

Все пользовательские таблицы имеют `user_id`. Политики RLS разрешают пользователю читать и изменять только свои строки.

## 5. API

### Supabase Data API

Используется для CRUD:

- цели;
- задачи;
- факты выполнения;
- документы знаний;
- weekly reviews.

### Edge Functions

| Функция            | Назначение                     |
| ------------------ | ------------------------------ |
| `ai-clarify`       | уточняющие вопросы по цели     |
| `ai-plan`          | план задач                     |
| `ai-weekly-review` | еженедельный обзор             |
| `embed-knowledge-document` | chunking + embeddings для заметки |
| `rag-answer`       | vector retrieval + grounded answer |
| `health`           | health check инфраструктуры    |

## 6. Обработка ошибок

| Ошибка                      | Поведение                                         |
| --------------------------- | ------------------------------------------------- |
| Невалидная форма цели       | Заблокировать отправку                            |
| Нет Supabase env            | Работать в демо-режиме                            |
| Нет пользовательской сессии | Не загружать приватные строки, показать demo-цели |
| Ошибка Edge Function        | Показать toast или fallback-сообщение             |
| OpenRouter timeout/error    | Вернуть безопасный JSON без секретов              |
| Пустые заметки RAG          | Ответить, что данных недостаточно                 |

## 7. Тестирование

Обязательные проверки:

- `pnpm run lint`;
- `pnpm run typecheck`;
- `pnpm run test`;
- `pnpm run build`;
- `pnpm run test:e2e`;
- `supabase db push --workdir . --yes`;
- smoke-вызовы Edge Functions.

## 8. Артефакты реализации

- Frontend: `src/`;
- Supabase: `supabase/migrations/`, `supabase/functions/`;
- Playwright: `playwright.config.ts`, `tests/e2e/`;
- Скриншоты и видео: `output/playwright/`.
