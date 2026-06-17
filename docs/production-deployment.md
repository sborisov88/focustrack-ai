# Production deployment notes

## Цель

Зафиксировать production-подход FocusTrack AI по образцу учебного проекта: Vercel для публичного frontend, Supabase Cloud для backend и OpenRouter только через серверный слой.

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
- Защищённые AI/RAG endpoints: `ai-clarify`, `ai-plan`, `ai-weekly-review`, `rag-answer`.

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

4. Сохранять evidence.
   - Логи деплоя лежат в `output/verification/logs/`.
   - Скриншоты и видео production-проверки лежат в `output/playwright/production/`.
   - Копии для сдачи лежат в `submissions/hw6/evidence/` и `submissions/final-project/evidence/`.

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

Опциональная переменная:

```text
VITE_YANDEX_METRIKA_ID
```

Проверить наличие переменных без раскрытия значений:

```bash
npx vercel env ls production
```

Ожидаемый результат:

```text
VITE_SUPABASE_URL                  Encrypted           Production
VITE_SUPABASE_PUBLISHABLE_KEY      Encrypted           Production
```

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
protected_ai_without_jwt_status=401
```

Лог:

```text
output/verification/logs/vercel-production-smoke.log
```

## Playwright evidence

Production capture:

```text
output/playwright/production/screenshots/vercel-desktop-initial.png
output/playwright/production/screenshots/vercel-desktop-after-flow.png
output/playwright/production/screenshots/vercel-mobile.png
output/playwright/production/videos/vercel-desktop-flow.webm
output/playwright/production/videos/vercel-mobile.webm
```

Сдачные копии:

```text
submissions/hw6/evidence/media/vercel-production/
submissions/final-project/evidence/media/vercel-production/
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
  --glob '!output' \
  --glob '!submissions/**/evidence'
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
