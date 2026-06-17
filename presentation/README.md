# FocusTrack AI — структура защиты

## 1. Проблема

Студенту или разработчику сложно удерживать фокус на длинной цели: требования, задачи, прогресс и weekly review живут в разных местах.

## 2. Решение

FocusTrack AI объединяет цель, AI-уточнение, план задач, прогресс и review в одном рабочем интерфейсе.

## 3. Демо-сценарий

1. Открыть дашборд.
2. Создать цель.
3. Отметить задачу выполненной.
4. Показать пересчет прогресса.
5. Запустить AI Review.
6. Показать Supabase schema, RLS и Edge Functions.
7. Показать Playwright screenshots/video.

## 4. Архитектура

```text
React + shadcn
  -> Supabase client
  -> PostgreSQL + RLS
  -> Edge Functions
  -> OpenRouter
```

## 5. Что показать из курса

- выбор Codex как AI coding assistant;
- AGENTS.md и prompt templates;
- ДЗ 3: ТЗ, user stories, UI-концепции;
- ДЗ 4: frontend;
- ДЗ 5: backend;
- ДЗ 6: CI/CD, OAuth, analytics, security;
- проект: рабочий MVP.
