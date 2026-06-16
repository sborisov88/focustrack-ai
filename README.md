# FocusTrack AI

Трекер целей обучения и профессионального роста с AI-планировщиком (clarify → plan → weekly review).

**Курс:** Otus — «ИИ-агенты: продвинутое внедрение и использование»  
**Статус:** Фаза 0 — подготовка (документация, инфраструктура)

## Документация

| Файл | Описание |
|------|----------|
| [docs/project_description.md](./docs/project_description.md) | Описание продукта, MVP, ЦА |
| [docs/adr/001-tech-stack.md](./docs/adr/001-tech-stack.md) | Архитектурное решение по стеку |
| [../FOCUSTRACK_AI_WORK_PLAN.md](../FOCUSTRACK_AI_WORK_PLAN.md) | План ДЗ 1–6 + проект |
| [../COURSE_HOMEWORK_MAP.md](../COURSE_HOMEWORK_MAP.md) | Карта курса |

## Стек (зафиксирован)

- **Frontend:** React 18, TypeScript, Vite, Tailwind, Recharts
- **Backend:** Supabase Cloud (PostgreSQL, Auth, RLS)
- **AI:** OpenRouter via Supabase Edge Functions

## Быстрый старт

> Код приложения появится в Фазах 4–5. Сейчас — только документация.

```bash
# после появления frontend/ и supabase/
cp .env.example frontend/.env.local
# заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

cd frontend && npm install && npm run dev
```

## Otus

- Проект: [homework-chat/47773](https://otus.ru/learning/493766/#/homework-chat/47773/)
