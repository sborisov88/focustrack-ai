# ДЗ 6 — integration documentation

## CI/CD

Workflow:

```text
.github/workflows/ci.yml
```

Quality gate выполняет:

- установку зависимостей;
- установку Playwright Chromium;
- lint;
- typecheck;
- unit tests;
- build;
- Playwright e2e;
- upload Playwright evidence.

Frontend deploy job:

```text
vercel-frontend-deploy
```

Job выполняет:

- pull Vercel production environment;
- build production artifact;
- deploy prebuilt artifact в Vercel production;
- upload deploy URL as workflow artifact.

Он включается только при push в `main` и:

```text
vars.VERCEL_DEPLOY_ENABLED == true
```

Необходимые Vercel secrets:

- `VERCEL_TOKEN`;
- `VERCEL_ORG_ID`;
- `VERCEL_PROJECT_ID`.

Supabase deploy job включается только при:

```text
vars.SUPABASE_DEPLOY_ENABLED == true
```

Необходимые secrets:

- `SUPABASE_ACCESS_TOKEN`;
- `SUPABASE_PROJECT_ID`.

Фактический production frontend URL:

```text
https://focustrack-ai.vercel.app
```

Подробный production runbook: `docs/production-deployment.md`.

## OAuth2

В frontend добавлена кнопка Google OAuth:

```text
src/lib/auth.ts
src/features/dashboard/focustrack-dashboard.tsx
```

Flow:

1. пользователь нажимает `Google`;
2. frontend вызывает `supabase.auth.signInWithOAuth`;
3. Supabase Auth выполняет redirect;
4. provider secret хранится только в настройках Supabase.

Yandex ID можно подключить как custom OIDC provider в Supabase Auth после регистрации приложения в кабинете провайдера.

## Аналитика

Добавлен helper:

```text
src/lib/analytics.ts
```

Поддерживаемые события:

- `goal_created`;
- `task_toggled`;
- `weekly_review_completed`;
- `oauth_started`.

Для Яндекс.Метрики используется переменная:

```bash
VITE_YANDEX_METRIKA_ID=
```

Если счетчик не задан, helper ничего не отправляет наружу. В dev-режиме событие логируется в консоль.

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

AI-сессии логируются в таблицу `ai_sessions` на уровне модели данных. На текущем MVP frontend также показывает историю AI-сессий в таблице.

## Платежи

Платежи не входят в MVP. Для будущего production-плана можно добавить тарифы и billing после подтверждения ценности core-flow.
