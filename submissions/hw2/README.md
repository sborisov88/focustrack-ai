# ДЗ 2 — Rules и промпт-шаблоны

Ссылка Otus: https://otus.ru/learning/493766/#/homework-chat/47734/

## Что сдавать

| Требование | Файл |
| --- | --- |
| Проектные правила агента | `AGENTS.md` |
| Описание проекта и стека | `docs/prompts/hw_ai_rules.md` |
| Набор правил | `docs/prompts/rules.md` |
| Шаблоны промптов | `docs/prompts/prompt_templates.md` |
| Методология промптинга | `docs/prompts/prompt_methodology.md` |
| Примеры применения и сравнение | `docs/prompts/testing.md` |

## Самопроверка

- правила созданы под реальный проект FocusTrack AI;
- есть не менее 10 правил для агента;
- есть не менее 5 шаблонов в RTCF-структуре;
- CoT-подход задокументирован как внутренний reasoning-процесс без раскрытия цепочки рассуждений пользователю;
- показано улучшение результата с rules;
- документы структурированы и используют терминологию курса.

## Проверка

```bash
test -f AGENTS.md
test -f docs/prompts/hw_ai_rules.md
test -f docs/prompts/rules.md
test -f docs/prompts/prompt_templates.md
test -f docs/prompts/prompt_methodology.md
test -f docs/prompts/testing.md
```

## Текст для отправки

```text
Добрый день! Сдаю ДЗ 2 по проекту FocusTrack AI.

Артефакты находятся в репозитории:
- AGENTS.md
- docs/prompts/hw_ai_rules.md
- docs/prompts/rules.md
- docs/prompts/prompt_templates.md
- docs/prompts/prompt_methodology.md
- docs/prompts/testing.md

Правила и промпт-шаблоны подготовлены под выбранный Codex workflow и единый проект FocusTrack AI.
```
