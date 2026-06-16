# FocusTrack AI

Трекер целей обучения и профессионального роста с AI-планировщиком (clarify → plan → weekly review).

**Репозиторий:** https://github.com/sborisov88/focustrack-ai  
**Статус:** ранняя стадия — документация и подготовка инфраструктуры

## Документация

| Файл | Описание |
|------|----------|
| [docs/project_description.md](./docs/project_description.md) | Описание продукта, MVP, ЦА |
| [docs/adr/001-tech-stack.md](./docs/adr/001-tech-stack.md) | Архитектурное решение по стеку |

## Стек (зафиксирован)

- **Frontend:** React 18, TypeScript, Vite, Tailwind, Recharts
- **Backend:** Supabase Cloud (PostgreSQL, Auth, RLS)
- **AI:** OpenRouter via Supabase Edge Functions

## Быстрый старт

> Код приложения появится на следующих этапах. Сейчас — только документация.

```bash
# после появления frontend/ и supabase/
cp .env.example frontend/.env.local
# заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

cd frontend && npm install && npm run dev
```
