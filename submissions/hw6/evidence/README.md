# Evidence — ДЗ 6

## Проверенные критерии

- CI/CD gate описан и локально воспроизведён;
- есть минимум 2 интеграции: Google OAuth entry point, analytics helper, Supabase health, OpenRouter через Edge Functions;
- audit проведён;
- health-check работает;
- RAG experiment задокументирован (ответы по личным заметкам пользователя: журнал тренировок, бюджет, план IELTS).

## Проверенные файлы

- `.github/workflows/ci.yml`
- `docs/integrations/integration_documentation.md`
- `docs/security/security_audit.md`
- `docs/research/002-knowledge-rag/experiment.md`
- `supabase/functions/health/`
- `tests/e2e/focustrack.spec.ts`

## Логи

- `logs/lint.log`
- `logs/typecheck.log`
- `logs/unit-test.log`
- `logs/build.log`
- `logs/audit.log`
- `logs/e2e.log`
- `logs/supabase-smoke.log`

## Медиа

- `media/dashboard-desktop-initial.png` — личный планировщик с категориями целей и жизненными целями (полумарафон, IELTS, подушка безопасности, лендинг пет-проекта);
- `media/dashboard-desktop-after-flow.png` — дашборд после прохождения сценария по целям и задачам;
- `media/dashboard-mobile.png` — адаптивный мобильный вид планировщика;
- `media/*.webm`.
