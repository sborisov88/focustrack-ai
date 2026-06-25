# Отчет о разработке frontend

## Цель

Собрать рабочий frontend FocusTrack AI по продуктовому ТЗ и правилам проекта из `AGENTS.md`.

## Стек

- React 19;
- TypeScript 6;
- Vite 8;
- shadcn/ui;
- Tailwind CSS 4;
- React Query;
- Recharts;
- Vitest;
- Playwright.

## Реализовано

| Требование        | Реализация                                               |
| ----------------- | -------------------------------------------------------- |
| 4 основных экрана | `/dashboard`, `/planner`, `/knowledge`, `/review`        |
| Дашборд целей     | `FocusTrackDashboard`                                    |
| Список целей      | `GoalList`                                               |
| Детали цели       | `GoalDetail`                                             |
| Задачи и статусы  | shadcn Checkbox + Badge                                  |
| CRUD              | создание, чтение, обновление task status и удаление цели |
| Прогресс          | shadcn Progress + Recharts                               |
| Weekly AI Review  | кнопка `AI Review` и панель результата                   |
| Knowledge/RAG     | CRUD заметок, индексация, vector retrieval и citations   |
| Auth              | email/password sign in, sign up, logout и Google OAuth   |
| Аналитика         | `trackEvent` с поддержкой Яндекс.Метрики                 |

## shadcn/ui

Интерфейс собран на shadcn-компонентах:

- `Button`;
- `Card`;
- `Dialog`;
- `Sidebar`;
- `Table`;
- `Tabs`;
- `Select`;
- `Progress`;
- `Chart`;
- `Alert`;
- `Tooltip`;
- `Sonner`.

## AI-техники разработки

Использованные подходы:

- сначала требования и user stories, затем код;
- переиспользуемые prompt templates для компонента, тестов и багфикса (структура RTCF: Role, Task, Context, Format);
- AI-анализ ошибок TypeScript и ESLint;
- AI-проверка негативных сценариев: пустые данные, отсутствие Supabase env, ошибка OpenRouter;
- Playwright для визуальной проверки desktop/mobile.

### Репрезентативные промпты разработки

Ниже приведены реально применявшиеся при разработке формулировки (по шаблону RTCF), с кратким описанием результата. Они показывают, как AI использовался как инженерный инструмент: от генерации компонента до валидации edge-кейсов.

1. **Форма создания цели с валидацией.**

   ```text
   Role: senior React + TypeScript разработчик FocusTrack AI.
   Task: реализуй диалог CreateGoalDialog с полями title, description, targetDate
   и кнопками действий.
   Context: shadcn Dialog/Field/Input/Textarea; кнопка отправки активна только при
   title.trim().length >= 3; нужны состояния loading и ошибки через toast.
   Format: план -> файлы -> код -> проверки.
   ```

   Результат: компонент `CreateGoalDialog` (`src/features/dashboard/focustrack-dashboard.tsx`) с порогом `canSubmit = draft.title.trim().length >= 3` и блокировкой кнопок на время мутаций.

2. **Цепочка AI clarify -> ответы -> plan как step-машина.**

   ```text
   Role: senior React engineer.
   Task: преврати создание цели в пошаговый флоу draft -> answering -> planned.
   Context: шаг draft показывает форму и кнопки "Добавить без AI" / "Уточнить с AI";
   после clarify приходит список вопросов, к каждому обязателен ответ
   (>=2 символа) перед формированием плана; результат плана показывается в Alert.
   Реакции пользователя не должны терять введённые ответы.
   Format: опиши состояние машины, затем код мутаций clarify/plan.
   ```

   Результат: тип `GoalCreationStep = "draft" | "answering" | "planned"`, мутации `clarifyMutation`/`planMutation` и условие `canPlan`, требующее непустых ответов на каждый AI-вопрос.

3. **Панель Knowledge/RAG с валидацией вопроса.**

   ```text
   Role: frontend engineer FocusTrack AI.
   Task: собери панель KnowledgePanel для ответов по заметкам через Edge Function
   rag-answer.
   Context: выбор источника через Select (rag-source-select), поле вопроса;
   кнопка "Спросить" доступна только при question.trim().length >= 5 и наличии
   хотя бы одного документа; ответ выводится в Alert, ошибки — через toast.
   Format: план -> код компонента -> список проверок.
   ```

   Результат: `KnowledgePanel` с условием `canAsk = question.trim().length >= 5 && canUseDocumentForRag(...)`, empty-state для пустого `knowledge_documents`, созданием стартового источника, ручным добавлением/редактированием заметки, статусами `Индексируется` / `Готово` / `Ошибка индексации` и серверным запросом `requestRagAnswer`.

4. **Тесты обработки ошибок API-слоя.**

   ```text
   Role: frontend test engineer.
   Task: добавь unit-тесты для focustrack-api на негативные сценарии и edge-кейсы.
   Context: замокай Supabase-клиент в null; проверь, что короткий RAG-вопрос и
   пустой список документов бросают понятные ошибки, что демо-фоллбэки
   clarification/plan/rag работают без сессии, и что toggleTask пересчитывает
   прогресс и безопасен на несуществующую задачу.
   Format: список сценариев -> файл теста -> команды проверки.
   ```

   Результат: `src/lib/focustrack-api.test.ts` с проверками `throws "Введите вопрос по заметкам."`, `throws "Нет документов для RAG-ответа."`, создания стартового RAG-источника, демо-фоллбэков и пересчёта прогресса в `toggleTask`.

### Мультимодальная и диагностическая отладка

AI применялся не только для генерации кода, но и как помощник в отладке — в том числе по визуальным артефактам и текстовым ошибкам.

- **Скриншот бага -> запрос к модели -> предложенный фикс (методика).**
  Скриншот проблемного экрана (например, обрезанный или невидимый контент в длинном диалоге на мобильном) прикладывается к запросу вместе с фрагментом разметки. Модель локализует причину по визуальному признаку и верстке и предлагает точечный фикс. Так был оформлен скролл длинного диалога создания цели: `DialogContent` получил `max-h-[calc(100vh-2rem)] overflow-y-auto`, а футер с действиями — `sticky bottom-0`, чтобы кнопки оставались доступны при прокрутке формы и AI-вопросов.

- **Интерпретация ошибки консоли/стека (методика + пример).**
  Текст ошибки и стек копируются в запрос с просьбой указать вероятную причину до правки кода. Правдоподобные примеры из реального стека проекта:
  - запрет прямого `useEffect` (lint-правило проекта): подписки и эффекты при монтировании выносятся в `useMountEffect` (см. `useAuthEmail` с подпиской на `supabase.auth.onAuthStateChange` и cleanup), вместо «голого» `useEffect`;
  - отсутствие Supabase env: вместо падения на `getSupabaseClient()` API-слой детерминированно деградирует в демо-режим (graceful fallback), что покрыто тестами с мок-клиентом, возвращающим `null`.

## Найденные и исправленные проблемы

| Проблема                                               | Исправление                                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Нужен запрет прямого `useEffect`                       | Эффекты монтирования вынесены в `useMountEffect` (`useAuthEmail`)                                                     |
| Supabase env может отсутствовать                       | Добавлен demo-mode fallback в API-слое                                                                                |
| OpenRouter ключ нельзя хранить во frontend             | AI-вызовы вынесены в Supabase Edge Functions                                                                          |
| Нужна визуальная регрессия для проверки UI             | Добавлены Playwright screenshots/video                                                                                |
| Декоративный Select имитировал действие                | «Мёртвый» Select источника знаний удалён из карточки «Категории целей»; рабочий — `rag-source-select`                 |
| Индикаторы Supabase/OpenRouter выглядели кликабельными | Sidebar-индикаторы режима и провайдера переведены в обычные статусные строки                                          |
| Требовались отдельные основные экраны                  | Добавлены URL `/dashboard`, `/planner`, `/knowledge`, `/review` и e2e-проверка навигации                              |
| CRUD не имел явного удаления                           | Добавлена кнопка удаления цели, API `deleteGoalOnServer` и e2e-сценарий удаления                                      |
| Auth не показывал регистрацию                          | Email/password диалог получил режим `sign-up`, сохранив demo login и Google OAuth                                     |
| Не хватало глобального loading/error                   | Добавлены loading banner/state, retry-state для workspace query и `AppErrorBoundary`                                  |
| Яндекс.Метрика не инициализировалась                   | `initAnalytics()` (`src/lib/analytics.ts`) грузит `tag.js` из `main.tsx`; активна только при `VITE_YANDEX_METRIKA_ID` |
| RAG не имел semantic retrieval                         | Добавлен UI CRUD заметок, запуск `embed-knowledge-document`, блокировка вопроса до статуса `Готово` и вывод citations |

## Правила проекта в Cursor

Правила проекта подключены в нативном формате Cursor: `.cursor/rules/focustrack.mdc` (`alwaysApply`) — зеркало корневого `AGENTS.md`. Это удерживает AI-ассистента в рамках выбранного стека, серверной модели вызовов AI и принятых конвенций при генерации и правках кода.

## Тесты

Unit (39 тестов в трёх файлах):

- `src/lib/progress.test.ts` — расчёт прогресса, группировка задач и подписи статусов;
- `src/lib/focustrack-api.test.ts` — обработка ошибок и edge-кейсы: валидация короткого RAG-вопроса (`throws "Введите вопрос по заметкам."`), пустой список документов (`throws "Нет документов для RAG-ответа."`), демо-фоллбэки `requestGoalClarification` / `requestGoalPlan` / `requestRagAnswer` без сессии, новый контракт `rag-answer` с `selectedDocumentId`, создание/редактирование заметки с вызовом `embed-knowledge-document`, chunking с overlap, пересчёт прогресса в `toggleTask` и edge на несуществующую задачу.
- `src/lib/auth.test.ts` — сообщения об ошибках OAuth и парольной аутентификации, ветки sign-up (подтверждение email).

E2E (9 passed / 11 skipped):

- проходят: desktop dashboard flow, AI clarify + plan, RAG, sidebar-навигация, login-диалог, mobile usability;
- пропущены: кросс-проектные дубли desktop/mobile и live-Supabase сценарий, требующий env `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`.

Google OAuth подключён через Supabase Auth (`src/lib/auth.ts`) как реальная точка входа; сквозной автоматический e2e-вход через Google не входит в набор — провайдерский сценарий проверяется вручную.

Edge Functions:

- `deno check supabase/functions/rag-answer/index.ts` — passed;
- `deno check supabase/functions/embed-knowledge-document/index.ts` — passed.

Команды:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
```

## Вывод

Frontend MVP реализован как рабочее приложение, а не как лендинг: пользователь может создать цель, отметить задачу, увидеть прогресс, запустить weekly review и работать с RAG-заметками. Production vector RAG gate закрыт 26 июня 2026 по Москве: OpenRouter `/embeddings` smoke подтвердил `baai/bge-m3` с `embedding.length === 1024`, Supabase migration/functions задеплоены, authenticated production smoke получил grounded answer с citation.
