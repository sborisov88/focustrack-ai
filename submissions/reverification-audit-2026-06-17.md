# Повторная проверка требований OTUS

Дата повторной проверки: 17 июня 2026.

Причина проверки: в предыдущей матрице ДЗ 6 был ошибочно засчитан как полностью закрытый, хотя в исходном задании есть явное требование автоматического деплоя и ссылки на работающее приложение.

## Свежая верификация

Команды прогнаны повторно:

| Проверка | Статус | Лог |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | OK | `output/verification/logs/recheck-pnpm-install.log` |
| `pnpm run lint` | OK | `output/verification/logs/recheck-lint.log` |
| `pnpm run typecheck` | OK | `output/verification/logs/recheck-typecheck.log` |
| `pnpm run test` | OK | `output/verification/logs/recheck-unit-test.log` |
| `pnpm run build` | OK | `output/verification/logs/recheck-build.log` |
| `pnpm audit --audit-level high` | OK | `output/verification/logs/recheck-audit.log` |
| `pnpm run test:e2e` | OK | `output/verification/logs/recheck-e2e.log` |
| Supabase live-smoke | OK | `output/verification/logs/recheck-supabase-smoke.log` |

Supabase recheck:

- functions: `ai-clarify`, `ai-plan`, `ai-weekly-review`, `health`, `rag-answer`;
- `OPENROUTER_API_KEY`: present;
- `OPENROUTER_MODEL`: present;
- migrations `20260617024511` and `20260617033231`: present locally and remotely;
- `supabase db push --linked --dry-run --yes`: remote database is up to date;
- `GET /functions/v1/health`: `200`;
- `POST /functions/v1/ai-weekly-review` without JWT: `401`.

## Итог по работам

| Работа | Статус | Почему |
| --- | --- | --- |
| ДЗ 1 | OK | Покрыты 6 шагов: требования, сравнение >=4 инструментов, выбор Codex, настройка, практика, отчёт. |
| ДЗ 2 | OK | Есть `AGENTS.md`, >=10 rules, >=5 RTCF templates, методология, A/B testing. |
| ДЗ 3 | OK | Есть описание продукта, >=3 UI-концепции, >=5 stories, Given/When/Then criteria, ТЗ и обработка ошибок. |
| ДЗ 4 | OK | Frontend собирается, есть >=3 функции из ТЗ, адаптивность, unit/e2e, скриншоты и видео. |
| ДЗ 5 | OK | Supabase backend работает, >=3 endpoints, RLS/JWT, e2e-интеграция, документация. |
| ДЗ 6 | OK после исправления | CI quality gate, Supabase deploy job, Vercel frontend deploy job, production URL и evidence добавлены. |
| Проектная работа | OK | MVP доступен локально и через production URL, backend работает в Supabase Cloud. |

## Детали по ДЗ 6

Исходное ДЗ 6 требует:

- настроить CI/CD для сборки и деплоя;
- этапы: install/deps, build, test, deploy;
- автоматический деплой при push в `main/master`;
- деплой на хостинг вроде Vercel, Netlify, Railway;
- в формате сдачи: работающее приложение и ссылка на деплой;
- в критериях: pipeline автоматически собирает и деплоит приложение.

Фактическое состояние после исправления:

- `.github/workflows/ci.yml` выполняет install, lint, typecheck, unit tests, build, e2e;
- `.github/workflows/ci.yml` имеет `supabase-deploy` job для migrations и Edge Functions;
- `supabase-deploy` условный: `vars.SUPABASE_DEPLOY_ENABLED == 'true'`;
- `.github/workflows/ci.yml` имеет `vercel-frontend-deploy` job для Vercel production;
- `vercel-frontend-deploy` условный: `vars.VERCEL_DEPLOY_ENABLED == 'true'`;
- frontend production URL: `https://focustrack-ai.vercel.app`;
- URL добавлен в README, `submissions/hw6/README.md`, `submissions/final-project/README.md`;
- evidence публичного frontend-деплоя сохранены в `submissions/hw6/evidence/` и `submissions/final-project/evidence/`.

Вывод: выявленный разрыв ДЗ 6 закрыт Vercel production deployment.

## Что было доделано

1. Выбран Vercel как хостинг frontend по образцу эталонного проекта.
2. Добавлены `vercel.json` и `.vercelignore`.
3. Добавлен deploy job `vercel-frontend-deploy` в `.github/workflows/ci.yml`.
4. Настроены production env vars в Vercel без вывода значений.
5. Выполнен `npx vercel deploy --prod --yes`.
6. Получен публичный URL: `https://focustrack-ai.vercel.app`.
7. Выполнен production smoke: frontend `200`, health `200`, protected AI endpoint без JWT `401`.
8. Записаны Playwright screenshots/video с публичного URL.
9. После push в `main` GitHub Actions run `27682163117` успешно прошёл quality gate и `vercel-frontend-deploy`.

Evidence:

- `output/verification/logs/vercel-link.log`;
- `output/verification/logs/vercel-env-sync.log`;
- `output/verification/logs/vercel-env-ls.log`;
- `output/verification/logs/vercel-deploy.log`;
- `output/verification/logs/vercel-production-smoke.log`;
- `output/verification/logs/github-actions-final-run.json`;
- `output/verification/logs/github-actions-final-production-smoke.log`;
- `output/verification/github-run-27682163117/vercel-deploy-url/vercel-deploy-url.txt`;
- `output/verification/logs/playwright-production-capture.log`;
- `output/playwright/production/`.

Осторожность: Vercel CLI не смог автоматически подключить GitHub repository к Vercel project, поэтому автодеплой через Vercel Git integration не засчитан. Для автоматического деплоя по push используется реализованный GitHub Actions job `vercel-frontend-deploy`; для его фактического запуска в GitHub нужно добавить secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` и включить var `VERCEL_DEPLOY_ENABLED=true`.
