# Настройка Cursor для FocusTrack AI

## 1. Установка

1. Скачать Cursor с https://cursor.com
2. Установить на macOS, запустить
3. Войти в аккаунт (Sign in)

## 2. Открытие проекта

1. **File → Open Folder**
2. Выбрать папку `focustrack-ai`
3. Убедиться, что в корне видны `README.md`, `docs/`, `.env.example`

## 3. Git и GitHub

1. В терминале Cursor: `git status` — репозиторий уже инициализирован
2. Remote: `https://github.com/sborisov88/focustrack-ai`
3. Коммиты и push выполняются из встроенного терминала или через агента

## 4. MCP-серверы

**Cursor Settings → MCP → Add server** (или редактирование `~/.cursor/mcp.json`):

| Сервер | Назначение |
|--------|------------|
| Context7 | Актуальная документация библиотек (React, Supabase) |
| cursor-ide-browser | Просмотр и отладка UI в браузере |

После добавления — перезапустить Cursor или обновить MCP.

## 5. Проверка работы агента

1. Открыть чат Agent (Composer)
2. Задать тестовый запрос: «Прочитай README.md и кратко перечисли стек проекта»
3. Агент должен прочитать локальный файл и ответить по содержимому

## 6. Тестовый проект

Создан репозиторий FocusTrack AI с документацией и практическим кодом (см. `practice/` и `practice_log.md`).

Проверка:

```bash
cd focustrack-ai
ls docs/project_description.md
ls docs/hw1-tool-analysis/practice/GoalCard.tsx
```

## 7. Что не настраивалось на этом этапе

- `.cursor/rules/` — будет в ДЗ 2
- Supabase CLI / `supabase start` — в ДЗ 5
- OpenRouter API key — в Supabase secrets, в ДЗ 5
