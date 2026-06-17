# Integration documentation

## CI/CD

Workflow:

```text
.github/workflows/ci.yml
```

Pipeline состоит из трёх jobs: `quality` (quality gate), `vercel-frontend-deploy` и `supabase-deploy`. Триггеры workflow: `push` в `main`, `pull_request` и ручной `workflow_dispatch`.

### Quality gate (`quality`)

Раннер `ubuntu-latest`, Node.js 24, пакетный менеджер `pnpm` через `corepack`. Шаги:

- checkout;
- setup Node.js;
- enable pnpm;
- install dependencies (`pnpm install --frozen-lockfile`);
- install Playwright Chromium (`pnpm exec playwright install --with-deps chromium`);
- lint (`pnpm run lint`);
- typecheck (`pnpm run typecheck`);
- unit tests (`pnpm run test`);
- build (`pnpm run build`);
- e2e (`pnpm run test:e2e`);
- upload Playwright артефактов (шаг с `if: always()`, артефакт `playwright-evidence`, путь `output/playwright`).

### Frontend deploy (`vercel-frontend-deploy`)

Зависит от `quality` (`needs: quality`). Включается только при push в `main` и `vars.VERCEL_DEPLOY_ENABLED == 'true'`. Шаги:

- pull Vercel production environment;
- build production artifact;
- deploy prebuilt artifact в Vercel production;
- запись deploy URL и публичного URL в `vercel-deploy-url.txt`, upload как artifact `vercel-deploy-url`.

Необходимые Vercel secrets:

- `VERCEL_TOKEN`;
- `VERCEL_ORG_ID`;
- `VERCEL_PROJECT_ID`.

### Supabase deploy (`supabase-deploy`)

Зависит от `quality` (`needs: quality`). Включается только при push в `main` и `vars.SUPABASE_DEPLOY_ENABLED == 'true'`. Шаги:

- setup Supabase CLI;
- link project (`supabase link --project-ref`);
- push database migrations (`supabase db push --yes`);
- deploy Edge Functions: `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health`.

Необходимые secrets:

- `SUPABASE_ACCESS_TOKEN`;
- `SUPABASE_PROJECT_ID`.

Фактический production frontend URL:

```text
https://focustrack-ai.vercel.app
```

Подробный production runbook: `docs/production-deployment.md`.

### AI-ассистирование при подготовке CI/CD

Конфигурация CI/CD готовилась с привлечением AI-инструментов разработки как обычная инженерная практика: AI-ассистент помогал составить структуру `ci.yml`, разбить pipeline на три независимых job (`quality`, `vercel-frontend-deploy`, `supabase-deploy`) и оформить условные триггеры деплоя через `vars.*_DEPLOY_ENABLED`. Это ускоряет черновую разработку YAML, но не заменяет инженерную проверку.

Принятый рабочий контур:

- AI генерирует и уточняет черновик пайплайна и отдельных шагов (matrix, conditions, секреты, порядок шагов quality gate);
- инженер ревьюит результат: корректность gating-условий, отсутствие утечки секретов, разделение деплоя фронтенда и бэкенда;
- финальная проверка — фактический прогон workflow в GitHub Actions; зелёный quality gate является доказательством, а не текст ассистента.

Корневой `AGENTS.md` и зеркальные cursor-правила `.cursor/rules/focustrack.mdc` (`alwaysApply`) фиксируют контекст продукта для AI-инструментов, чтобы предложения по конфигурации были согласованы со стеком (pnpm, Node 24, Supabase, Vercel).

## OAuth2

Вход через Google реализован поверх Supabase Auth. Реальный entry point:

```text
src/lib/auth.ts -> signInWithOAuth("google")
src/features/dashboard/focustrack-dashboard.tsx
```

`signInWithOAuth` поддерживает провайдер `google` (тип `SupportedOAuthProvider`), при отсутствии конфигурации Supabase выбрасывает ошибку `Supabase OAuth не настроен для текущего окружения.` и вызывает `supabase.auth.signInWithOAuth` с `redirectTo: globalThis.location.origin`.

Flow:

1. пользователь нажимает `Google`; UI отправляет аналитическое событие `oauth_started` (`provider: "google"`);
2. frontend вызывает `supabase.auth.signInWithOAuth({ provider: "google" })`;
3. Supabase Auth выполняет redirect к Google и обратно на origin приложения;
4. provider client secret хранится только в настройках Supabase Auth, в коде фронтенда его нет.

Статус проверки: entry point реальный и собирается. Сквозной (end-to-end) вход именно через Google проверяется вручную — автоматизированного e2e-доказательства полного OAuth-цикла в evidence нет. e2e-сценарий логина в наборе покрывает диалог входа, а live-Supabase сценарий пропускается без env `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`.

### Настройка Google OAuth в Supabase Cloud

Cloud-проект: `wbxyyvvuqrhqtuywfeto` (`VITE_SUPABASE_URL` / fallback в `src/lib/supabase.ts`).

Callback URL Supabase Auth (обязателен в Google Cloud Console):

```text
https://wbxyyvvuqrhqtuywfeto.supabase.co/auth/v1/callback
```

#### Шаг 1. Google Cloud Console

1. Открыть [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Создать **OAuth client ID** типа **Web application**.
3. Заполнить:
   - **Authorized JavaScript origins:**
     - `https://focustrack-ai.vercel.app`
     - `http://127.0.0.1:5173` (локальный `pnpm dev` / `start.sh`)
   - **Authorized redirect URIs:**
     - `https://wbxyyvvuqrhqtuywfeto.supabase.co/auth/v1/callback`
4. Сохранить **Client ID** и **Client Secret**.

#### Шаг 2. Supabase Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → проект → **Authentication** → **Providers** → **Google**.
2. Включить **Enable Sign in with Google**.
3. Вставить Client ID и Client Secret из Google Cloud Console.

#### Шаг 3. Redirect URLs в Supabase

**Authentication** → **URL Configuration**:

| Поле | Значение |
|------|----------|
| Site URL | `https://focustrack-ai.vercel.app` |
| Redirect URLs | `https://focustrack-ai.vercel.app`, `http://127.0.0.1:5173` |

Frontend после OAuth возвращает пользователя на `globalThis.location.origin` (`src/lib/auth.ts`), поэтому origin приложения должен быть в allow-list Supabase.

#### Проверка и типичные ошибки

| Симптом | Причина | Действие |
|---------|---------|----------|
| `provider is not enabled` | Google выключен или без credentials в Supabase | Включить провайдер, вставить Client ID/Secret |
| `Invalid redirect URL` | Origin приложения не в Redirect URLs | Добавить URL в Supabase URL Configuration |
| Ошибка Google `redirect_uri_mismatch` | Неверный callback в Google Cloud | Добавить Supabase callback URI (см. выше) |

UI маппит ошибку `provider is not enabled` на понятный toast через `getOAuthErrorMessage()` в `src/lib/auth.ts` (см. также `DEMO_ACCESS.md`).

До настройки OAuth доступен вход по email/password, включая публичный demo-аккаунт из `DEMO_ACCESS.md`.

Yandex ID можно подключить как custom OIDC provider в Supabase Auth после регистрации приложения в кабинете провайдера.

## Аналитика

Helper аналитики:

```text
src/lib/analytics.ts
```

Яндекс.Метрика реально инициализируется. `initAnalytics()` (`src/lib/analytics.ts`) подгружает официальный `https://mc.yandex.ru/metrika/tag.js`, определяет `window.ym` и вызывает `ym(counterId, "init", ...)` с `clickmap`, `trackLinks`, `accurateTrackBounce`. Инициализация выполняется один раз из `src/main.tsx:9` до рендера приложения.

Активация управляется переменной окружения:

```bash
VITE_YANDEX_METRIKA_ID=
```

- если `VITE_YANDEX_METRIKA_ID` задан и `> 0` — счётчик инициализируется и `reachGoal`-события уходят наружу;
- если ID не задан (или `0`) — `initAnalytics()` и `trackEvent()` работают как безопасный no-op (наружу ничего не отправляется);
- на сервере / в тестах при отсутствии `window`/`document` — тоже no-op.

`trackEvent({ name, params })` отправляет `reachGoal`-события (`window.ym(counterId, "reachGoal", name, params)`); в dev-режиме дополнительно логирует событие в консоль.

В UI (`src/features/dashboard/focustrack-dashboard.tsx`) вызывается не менее 3 `reachGoal`-событий — фактически больше:

- `goal_created` (`:244`) — создана цель;
- `task_toggled` (`:1252`) — переключён статус задачи;
- `weekly_review_completed` (`:1202`) — завершён еженедельный обзор;
- `ai_clarify_completed` (`:263`), `ai_plan_completed` (`:315`), `rag_answer_completed` (`:1078`) — завершены AI-сценарии;
- `oauth_started` (`:499`), `password_sign_in` (`:576`), `sign_out` (`:671`) — события аутентификации;
- `sidebar_navigation_clicked` (`:1261`) — навигация по разделам.

## Monitoring

Добавлена Edge Function:

```text
supabase/functions/health/index.ts
```

Она возвращает:

- статус сервиса;
- факт наличия OpenRouter secret;
- модель;
- timestamp проверки.

## Логирование

### Структурированное JSON-логирование Edge Functions

Модуль логирования:

```text
supabase/functions/_shared/logger.ts
```

API:

- `logEvent(level, fn, message, fields)` — пишет одну запись;
- `createLogger(fn)` — фабрика логгера с методами `info` / `warn` / `error`, привязанными к имени функции.

Уровни: `info | warn | error`. Каждая запись — отдельная строка JSON вида:

```json
{ "level": "info", "ts": "<ISO-8601>", "fn": "<function>", "message": "<text>", "...поля": "..." }
```

`level: "error"` пишется через `console.error`, `warn` — через `console.warn`, остальное — `console.log`, чтобы запись корректно раскладывалась по потокам в логах Supabase.

Логирование подключено в Edge Functions `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `health`, а также в общий клиент `_shared/openrouter.ts`: `callOpenRouter` пишет латентность успешного ответа (`latencyMs`, `model`), предупреждение о пустом ответе модели и ошибки вызова модели (`status`, `model`, `latencyMs`). Это даёт сквозную трассировку запроса от функции до модели в едином JSON-формате.

### AI-анализ логов

Единый JSON-формат позволяет анализировать логи AI-инструментами без предварительного парсинга. Пример промпта для анализа выгрузки логов Edge Functions:

```text
Проанализируй приложенные JSON-логи Edge Functions (по одной записи на строку).
Сгруппируй записи по полям level и fn. Для каждой группы посчитай количество записей.
Выяви все записи с level "error" и "warn", приведи их message и сопутствующие поля.
По полю latencyMs найди аномалии латентности вызовов модели (выбросы относительно медианы по fn)
и отметь функции с деградацией. Верни краткую сводку: ошибки, предупреждения, узкие места по латентности.
```

Промпт опирается только на реально присутствующие поля (`level`, `fn`, `message`, `latencyMs`, `status`, `model`, `ts`).

### Хранение AI-сессий

AI-сессии логируются в таблицу `ai_sessions` на уровне модели данных. На текущем MVP frontend также показывает историю AI-сессий в таблице.

## Платежи

Платежи не входят в MVP. Для будущего production-плана можно добавить тарифы и billing после подтверждения ценности core-flow.
