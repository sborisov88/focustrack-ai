# Production deployment notes

## Цель

Зафиксировать production-подход FocusTrack AI: Vercel для публичного frontend, Supabase Cloud для backend и OpenRouter только через серверный слой.

Production URL:

```text
https://focustrack-ai.vercel.app
```

## Архитектура деплоя

- Frontend: React + Vite + TypeScript.
- UI: shadcn/ui + Tailwind CSS + lucide-react + Recharts.
- Production-хостинг frontend: Vercel.
- Backend / DB / Auth: Supabase Cloud.
- AI-провайдер: OpenRouter через Supabase Edge Functions.
- Публичный health endpoint: Supabase Edge Function `health`.
- Защищённые AI/RAG endpoints: `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`, `embed-knowledge-document`.

## Почему выбран Vercel

Vercel используется как основной production-хостинг frontend, потому что он хорошо подходит для Vite-приложения, даёт публичный URL, production alias, preview/production окружения и простой CLI-деплой.

В FocusTrack AI OpenRouter не вызывается из frontend и не хранится в Vercel. Ключ OpenRouter остаётся только в Supabase secrets, а frontend обращается к Supabase Edge Functions.

## Принципы production-деплоя

1. Не раскрывать секреты.
   - `.env.local` не попадает в git.
   - В Vercel production заданы только frontend-переменные `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - `OPENROUTER_API_KEY` и `OPENROUTER_MODEL` хранятся только в Supabase secrets.

2. Проверять сборку до деплоя.
   - Перед публикацией запускаются `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, `pnpm run test:e2e`.
   - Vercel собирает проект командой `pnpm run build`.

3. Проверять production, а не только localhost.
   - После деплоя проверяется `https://focustrack-ai.vercel.app`.
   - Отдельно проверяется Supabase health endpoint.
   - Защищённый AI endpoint без JWT должен возвращать `401`.

4. Сохранять артефакты проверки вне публичного продуктового репозитория, если они содержат учебный контекст, локальные абсолютные пути, provider-dashboard screenshots или другие непубличные детали.

## Локальная подготовка

Установить зависимости:

```bash
pnpm install --frozen-lockfile
```

Локальные frontend-переменные:

```bash
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase publishable key>
VITE_YANDEX_METRIKA_ID=
```

OpenRouter-переменные не нужны в Vercel frontend. Они задаются в Supabase:

```bash
OPENROUTER_API_KEY=<secret>
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
```

## Проверка перед деплоем

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
pnpm audit --audit-level high
```

## Vercel Environment Variables

Production-переменные задаются через Vercel CLI без вывода значений в терминал.

Обязательные переменные:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Дополнительная production-переменная для аналитики:

```text
VITE_YANDEX_METRIKA_ID
```

Текущий production на Vercel использует счётчик Яндекс.Метрики `110130059`. Переменная задана в окружении `Production` и не должна быть помечена как `Sensitive`, потому что Vite встраивает `VITE_*` значения в frontend-бандл на этапе build.

Проверить наличие переменных без раскрытия значений:

```bash
npx vercel env ls production
```

Ожидаемый результат:

```text
VITE_SUPABASE_URL                  Encrypted           Production
VITE_SUPABASE_PUBLISHABLE_KEY      Encrypted           Production
VITE_YANDEX_METRIKA_ID             Encrypted           Production
```

Проверка production-активации Метрики: открыть `https://focustrack-ai.vercel.app` в браузере с DevTools Network и убедиться, что загружается `https://mc.yandex.ru/metrika/tag.js`; в Console `typeof window.ym` должен быть `function`.

Проверка production-активации не должна опираться на fixed asset hash: имя Vite-бандла меняется при каждой сборке. Достаточно проверить, что production HTML загружает актуальный bundle, а runtime содержит `VITE_YANDEX_METRIKA_ID`, `mc.yandex` и `ym(..., "init", ...)`.

## Production deploy

Связать проект:

```bash
npx vercel link --yes --project focustrack-ai
```

Опубликовать production:

```bash
npx vercel deploy --prod --yes
```

Фактический результат 17 июня 2026:

```text
Production deployment: READY
Production alias: https://focustrack-ai.vercel.app
Deployment id: dpl_5xmKGgg6cF5my2adSDKMHzqU3rzh
```

Фактический автоматический deploy через GitHub Actions:

```text
Run: https://github.com/sborisov88/focustrack-ai/actions/runs/27682163117
Quality gate: success
Vercel frontend deploy: success
Production alias: https://focustrack-ai.vercel.app
```

Фактический автоматический deploy 25 июня 2026 после закрытия fresh-user RAG flow:

```text
Commit: c1b021652a6783d9fcaf5b7bb44b7784de20d37a
Run: https://github.com/sborisov88/focustrack-ai/actions/runs/28139826719
Quality gate: success
Vercel frontend deploy: success
Supabase deploy: skipped по условию workflow, изменений Edge Functions в этом commit не было
Production alias: https://focustrack-ai.vercel.app
Deployment URL: https://focustrack-2yx8lri9a-sborisov88s-projects.vercel.app
```

## GitHub Actions deploy

В `.github/workflows/ci.yml` добавлен job `vercel-frontend-deploy`.

Он запускается после `quality` при push в `main`, если включена переменная:

```text
vars.VERCEL_DEPLOY_ENABLED == 'true'
```

Необходимые GitHub Actions secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Project identifiers после `vercel link` находятся локально в `.vercel/project.json`, но сама папка `.vercel/` не коммитится.

## Проверка после деплоя

Production smoke:

```text
frontend_url=https://focustrack-ai.vercel.app
frontend_status=200
frontend_has_title=true
health_status=200
health_database_reachable=true
protected_ai_without_jwt_status=401
protected_ai_publishable_jwt_status=401
fresh_user_rag_bundle_has_empty_state=true
fresh_user_rag_bundle_has_starter_source_flow=true
protected_rag_without_jwt_status=401
security_headers_present=true
```

Redacted verification evidence хранится во внешнем teacher-facing пакете верхнего workspace. В публичном repo остаётся только summary без secrets, cookies, tokens и абсолютных локальных путей.

## Security headers

Vercel отдаёт базовые security headers из `vercel.json`:

- `Content-Security-Policy`;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy`.

Проверка:

```bash
node -e 'fetch("https://focustrack-ai.vercel.app").then((r)=>console.log(Object.fromEntries(["content-security-policy","x-frame-options","x-content-type-options","referrer-policy","permissions-policy"].map((h)=>[h,r.headers.get(h)]))))'
```

## Secret-safety check

Перед отправкой проверить, что секреты не попали в репозиторий:

```bash
SECRET_PATTERN='sbp_[[:alnum:]]{20,}|sk-or-v1-[[:alnum:]_-]{20,}|OPENROUTER_API_KEY='"'sk-'"'|VERCEL_TOKEN=[[:alnum:]_-]+'
rg -n "$SECRET_PATTERN" . \
  --glob '!.env.local' \
  --glob '!node_modules' \
  --glob '!dist' \
  --glob '!.vercel' \
  --glob '!output'
```

Ожидаемый результат:

```text
secret scan: ok
```

## Rollback и повторный деплой

Откат можно выполнить через Vercel dashboard, выбрав предыдущий production deployment.

Повторный деплой текущего состояния:

```bash
pnpm run build
npx vercel deploy --prod --yes
```
