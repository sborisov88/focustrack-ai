# Evidence — ДЗ 6

## Проверенные критерии

- CI/CD gate описан и локально воспроизведён (typecheck, lint, unit 30 passed, build, e2e 9 passed / 11 skipped — EXIT 0);
- есть минимум 2 интеграции: Google OAuth entry point (Supabase Auth), реальная инициализация Яндекс.Метрики (`initAnalytics`, активна при `VITE_YANDEX_METRIKA_ID > 0`, без ID — no-op), Supabase health, OpenRouter через Edge Functions;
- audit проведён; использование AI в аудите задокументировано в `docs/security/security_audit.md`;
- health-check работает;
- структурированное JSON-логирование Edge Functions реализовано (`supabase/functions/_shared/logger.ts`, уровни `info|warn|error`); пример AI-промпта для анализа логов — в `docs/integrations/integration_documentation.md`;
- CORS переведён с wildcard `*` на явный allowlist;
- RAG experiment задокументирован (ответы по личным заметкам пользователя: журнал тренировок, бюджет, план IELTS).

Замечание по OAuth: entry point Google реальный (Supabase Auth), сквозной вход проверяется вручную — автоматизированного e2e-доказательства полного OAuth-цикла в evidence нет.

## Проверенные файлы

- `.github/workflows/ci.yml`
- `docs/integrations/integration_documentation.md`
- `docs/security/security_audit.md`
- `docs/research/002-knowledge-rag/experiment.md`
- `supabase/functions/health/`
- `supabase/functions/_shared/logger.ts`
- `supabase/functions/_shared/openrouter.ts` (CORS allowlist, логирование вызовов модели)
- `src/lib/analytics.ts`
- `src/lib/focustrack-api.test.ts`
- `tests/e2e/focustrack.spec.ts`

## Логи

- `logs/lint.log`
- `logs/typecheck.log`
- `logs/unit-test.log`
- `logs/build.log`
- `logs/audit.log`
- `logs/e2e.log`
- `logs/supabase-smoke.log`

Актуальный прогон 20 июня 2026 (после доработок health, CORS, streak и 404): unit `30 passed` в 3 файлах (`progress.test.ts` + `focustrack-api.test.ts` + `auth.test.ts`), e2e `9 passed / 11 skipped` (9 проходящих: desktop dashboard flow, AI clarify+plan, RAG, sidebar-навигация, strict 404, login-диалог, delete goal, demo close, mobile usability; 11 skipped — кросс-проектные дубли desktop/mobile и live-Supabase сценарий, требующий env `E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`).

## Медиа

- `media/dashboard-desktop-initial.png` — личный планировщик с категориями целей и жизненными целями (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта);
- `media/dashboard-desktop-after-flow.png` — дашборд после прохождения сценария по целям и задачам;
- `media/dashboard-mobile.png` — адаптивный мобильный вид планировщика;
- `media/*.webm`.
