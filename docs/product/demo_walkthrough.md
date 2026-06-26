# Product demo walkthrough

## Цель демо

Показать FocusTrack AI как рабочий MVP: пользователь формулирует цель, уточняет её с AI, получает план, отмечает прогресс, задаёт вопрос по личным заметкам и видит weekly review.

## 10-минутный сценарий

| Время      | Экран           | Что показать                                      | Ключевая мысль                                                  |
| ---------- | --------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| 0:00-1:00  | Главный экран   | Проблема размытой цели и демо-цели                | FocusTrack превращает намерение в проверяемый план              |
| 1:00-2:00  | Dashboard       | Цели, прогресс, серия, статус Supabase/OpenRouter | Пользователь видит состояние в одном месте                      |
| 2:00-3:00  | New goal        | Название, контекст, дедлайн                       | Входные данные простые и понятные                               |
| 3:00-4:00  | AI clarify      | Кнопка уточнения и вопросы                        | AI помогает сделать цель конкретнее                             |
| 4:00-5:00  | AI plan         | Генерация задач                                   | План становится набором действий                                |
| 5:00-6:00  | Planner         | Отметка задачи и обновление прогресса             | Прогресс сохраняется и отражается в UI                          |
| 6:00-7:00  | Knowledge       | Создание заметки и индексация                     | Пользователь добавляет собственный контекст                     |
| 7:00-8:00  | RAG answer      | Вопрос по заметкам и citations                    | Ответ строится по данным пользователя, без фабрикации           |
| 8:00-9:00  | Review          | Weekly AI Review                                  | AI суммирует факты и предлагает следующий шаг                   |
| 9:00-10:00 | Architecture/CI | Supabase, RLS, Edge Functions, CI/CD              | Секреты на сервере, данные изолированы, checks автоматизированы |

## Что должно быть видно

- Production URL: `https://focustrack-ai.vercel.app`.
- Локальный запуск: `./start.sh`.
- Рабочие разделы: `/dashboard`, `/planner`, `/knowledge`, `/review`.
- Защищённые AI/RAG вызовы идут через Supabase Edge Functions.
- OpenRouter API key не находится во frontend.
- RLS не даёт пользователю видеть чужие строки.
- CI запускает lint, typecheck, unit, Deno checks, build, e2e и dependency audit.

## Evidence checklist

Перед демонстрацией полезно прогнать:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
pnpm audit --audit-level high
FOCUSTRACK_CHECK_ONLY=1 ./start.sh
```

Для live persistence:

```bash
E2E_DEMO_EMAIL=<demo-user> \
E2E_DEMO_PASSWORD=<demo-password> \
PLAYWRIGHT_BASE_URL=https://focustrack-ai.vercel.app \
pnpm exec playwright test --project=chromium-desktop -g "live Supabase flow persists"
```
