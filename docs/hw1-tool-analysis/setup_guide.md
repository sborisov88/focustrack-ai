# Настройка Codex для FocusTrack AI

## 1. Доступ к инструменту

1. Войти в Codex через аккаунт OpenAI / ChatGPT.
2. Открыть локальную папку проекта `focustrack-ai`.
3. Убедиться, что Codex видит рабочую директорию, git-статус и файлы репозитория.

Актуальная справка OpenAI:

- Codex: https://developers.openai.com/codex
- Codex CLI: https://developers.openai.com/codex/cli
- Codex IDE extension: https://developers.openai.com/codex/ide

## 2. Открытие проекта

Проверка локального проекта:

```bash
cd focustrack-ai
git status --short --branch
ls README.md docs/hw1-tool-analysis
```

Ожидаемый результат:

- ветка `main` синхронизирована с `origin/main`;
- в репозитории есть `README.md`;
- материалы ДЗ лежат в `docs/hw1-tool-analysis/`.

## 3. Git и GitHub

Проверка remote:

```bash
git remote -v
```

Ожидаемый remote:

```text
origin  https://github.com/sborisov88/focustrack-ai.git
```

Коммиты и push выполняются из локального терминала через Codex:

```bash
git add README.md docs/hw1-tool-analysis
git commit -m "..."
git push origin main
```

## 4. MCP и дополнительные инструменты

В текущей работе использовались:

| Инструмент | Назначение |
|------------|------------|
| context-mode | Индексация и сверка больших markdown-артефактов без перегрузки контекста |
| Browser | Проверка Otus во встроенном браузере |
| web search | Актуализация исследования по официальным источникам |
| git / shell | Проверка статуса, состава репозитория, diff, commit и push |

## 5. Проверка работы агента

Практический тест Codex:

1. прочитать обычное и расширенное ДЗ 1;
2. сверить требования с репозиторием;
3. обновить `comparison_table.md`, `tool_selection.md`, `setup_guide.md`, `practice_log.md`, `report.md`;
4. проверить структуру репозитория;
5. сделать commit и push.

## 6. Тестовый проект

Создан репозиторий FocusTrack AI с материалами ДЗ и практическим кодом.

Проверка:

```bash
cd focustrack-ai
ls docs/hw1-tool-analysis/report.md
ls docs/hw1-tool-analysis/comparison_table.md
ls docs/hw1-tool-analysis/practice/GoalCard.tsx
```

## 7. Что не настраивалось на этом этапе

- полноценный frontend — будет в следующих ДЗ;
- Supabase CLI / `supabase start` — в backend-этапе;
- OpenRouter API key — не нужен для ДЗ 1 и не хранится в git.
