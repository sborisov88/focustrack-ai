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
ls README.md docs/research/001-ai-tooling
```

Ожидаемый результат:

- ветка `main` синхронизирована с `origin/main`;
- в репозитории есть `README.md`;
- проектные материалы лежат в `docs/research/001-ai-tooling/`.

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
git add README.md docs/research/001-ai-tooling
git commit -m "..."
git push origin main
```

## 4. Дополнительные инструменты

В текущей работе использовались:

| Инструмент | Назначение |
|------------|------------|
| git / shell | Проверка статуса, состава репозитория, diff, commit и push |
| web search | Актуализация исследования по официальным источникам |
| MCP/tools | Работа с локальными файлами и проверками |

## 5. Проверка работы агента

Практический тест Codex:

1. изучить структуру локального репозитория;
2. обновить проектные документы;
3. сгенерировать пример TypeScript/React-кода;
4. проверить `git diff`, `git status` и состав файлов;
5. сделать commit и push.

## 6. Тестовый проект

Создан репозиторий FocusTrack AI с проектными материалами и практическим кодом.

Проверка:

```bash
cd focustrack-ai
ls docs/research/001-ai-tooling/report.md
ls docs/research/001-ai-tooling/comparison_table.md
ls docs/research/001-ai-tooling/practice/GoalCard.tsx
```

## 7. Что не настраивалось на этом этапе

- полноценный frontend — следующий этап разработки;
- Supabase CLI / `supabase start` — backend-этап;
- OpenRouter API key — не нужен на текущем этапе и не хранится в git.
