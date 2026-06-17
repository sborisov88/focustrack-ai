# ДЗ 6 — CI/CD, интеграции, безопасность, RAG

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47738/

## Что сдавать

| Требование                | Файл                                             |
| ------------------------- | ------------------------------------------------ |
| CI/CD                     | `.github/workflows/ci.yml`                       |
| Integration documentation | `docs/integrations/integration_documentation.md` |
| Security audit            | `docs/security/security_audit.md`                |
| RAG experiment            | `docs/research/002-knowledge-rag/experiment.md`  |
| Monitoring                | `supabase/functions/health/`                     |
| Production deploy         | `docs/production-deployment.md`, `vercel.json`   |

Production URL:

```text
https://focustrack-ai.vercel.app
```

## Интеграции

- Google OAuth через Supabase Auth;
- analytics event helper для Яндекс.Метрики;
- Supabase health endpoint;
- JWT protection for AI/RAG Edge Functions;
- GitHub Actions quality gate;
- Vercel production deployment;
- controlled RAG experiment через OpenRouter (ответы по личным заметкам пользователя: журнал тренировок, бюджет, план IELTS).

## Проверка

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
pnpm audit
```

Фактическая проверка 17 июня 2026:

```text
pnpm run lint -> pass
pnpm run typecheck -> pass
pnpm run test -> pass
pnpm run build -> pass
pnpm run test:e2e -> pass
pnpm audit --audit-level high -> No known vulnerabilities found
Vercel production deploy -> READY, https://focustrack-ai.vercel.app
GitHub Actions CI + Vercel deploy -> success
Production frontend smoke -> 200
GET /functions/v1/health -> 200
POST /functions/v1/ai-weekly-review без JWT -> 401
```

## Повторная проверка 17 июня 2026

Статус ДЗ 6 после повторной сверки и исправления deploy-разрыва: **закрыто**.

Закрыто:

- quality gate GitHub Actions описан;
- Supabase deploy job для migrations/functions есть;
- Vercel frontend deploy job добавлен;
- production URL работает: `https://focustrack-ai.vercel.app`;
- OAuth entry point, analytics helper, health endpoint, security audit и RAG experiment подготовлены;
- локальные проверки, Playwright e2e и production Playwright capture проходят.

Подробности: `submissions/reverification-audit-2026-06-17.md`.

Production evidence:

- `submissions/hw6/evidence/logs/vercel-deploy.log`;
- `submissions/hw6/evidence/logs/github-actions-final-run.json`;
- `submissions/hw6/evidence/logs/github-actions-final-production-smoke.log`;
- `submissions/hw6/evidence/logs/github-run-27682163117/vercel-deploy-url.txt`;
- `submissions/hw6/evidence/logs/vercel-production-smoke.log`;
- `submissions/hw6/evidence/logs/playwright-production-capture.log`;
- `submissions/hw6/evidence/media/vercel-production/`.

## Текст для отправки

```text
Добрый день! Сдаю ДЗ 6 по FocusTrack AI.

Добавлены CI/CD, OAuth entry point, analytics helper, health endpoint, JWT-protected AI/RAG Edge Functions, security audit и RAG experiment.
Production: https://focustrack-ai.vercel.app

Основные файлы:
- .github/workflows/ci.yml
- vercel.json
- docs/production-deployment.md
- docs/integrations/integration_documentation.md
- docs/security/security_audit.md
- docs/research/002-knowledge-rag/experiment.md
```
