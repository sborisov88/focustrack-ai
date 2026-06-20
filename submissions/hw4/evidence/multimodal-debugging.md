# AI-process evidence: мультимодальная frontend-отладка

Дата фиксации: 20 июня 2026.
HEAD проверки: `9c13573`.

Этот файл фиксирует контрольный evidence для ДЗ 4: как AI использовался для проверки frontend по визуальным артефактам и текстовым критериям. В этом прогоне Codex визуально просмотрел скриншоты `dashboard-desktop-after-flow.png`, `dashboard-mobile.png` и `concept-2-mission-control-desktop.png`, а затем сверил выводы с фактическими файлами проекта.

## Связь с критерием

Критерии ДЗ 4:

- frontend должен запускаться, собираться и реализовывать минимум 3 функции из ТЗ;
- интерфейс должен быть адаптивным;
- отчет о разработке должен показывать применение AI-инструментов;
- скриншоты и видео должны подтверждать рабочий UI.

Проверяемые артефакты:

- `docs/frontend/development_report.md`;
- `src/features/dashboard/focustrack-dashboard.tsx`;
- `src/lib/focustrack-api.ts`;
- `tests/e2e/focustrack.spec.ts`;
- `submissions/hw4/evidence/media/dashboard-desktop-after-flow.png`;
- `submissions/hw4/evidence/media/dashboard-mobile.png`;
- `submissions/hw4/evidence/media/*.webm`;
- `submissions/hw4/evidence/logs/e2e.log`.

## Промпт

```text
Role: frontend QA reviewer with visual debugging skills.
Task: inspect the attached FocusTrack AI desktop and mobile screenshots and find
layout, usability, text, state and acceptance-criteria problems.
Context:
- The product is a working dashboard, not a landing page.
- Required functions: goals, task status changes, progress, AI Review, RAG,
  responsive layout, auth entry point.
- Screenshots:
  submissions/hw4/evidence/media/dashboard-desktop-after-flow.png
  submissions/hw4/evidence/media/dashboard-mobile.png
- Cross-check against docs/frontend/development_report.md and Playwright e2e.
Format:
- visual observations;
- possible defects;
- required fixes;
- evidence that the final UI satisfies the criteria.
```

## Зафиксированный вывод агента

### Visual observations

- Desktop-экран показывает рабочий продукт с навигацией, списком целей, выбранной целью, задачами, AI Review, блоком категорий, Knowledge/RAG и журналом AI-сессий.
- Mobile-экран перестраивает те же блоки в одну колонку: цели, метрики, выбранная цель, задачи, прогресс, Knowledge/RAG, AI-сессии, AI Review и категории целей.
- На мобильном viewport не видно горизонтального переполнения; длинный контент переносится в карточках, а не уезжает за экран.
- Основные кнопки доступны: `Google`, `Новая цель`, `AI Review`, чекбоксы задач.
- Текст соответствует предметной области продукта: цели, задачи, weekly review, RAG, категории целей. В скриншотах не видно посторонних учебных формулировок внутри пользовательского UI.

### Possible defects

| Риск | Проверка | Статус |
| --- | --- | --- |
| Длинный mobile dialog может скрыть кнопки действий | Сверено с `docs/frontend/development_report.md`: длинный диалог получил `max-h` и `overflow-y-auto`, футер закреплен | Закрыто |
| Неочевидные декоративные элементы могут выглядеть кликабельными | В отчете зафиксировано удаление декоративного Select и перевод sidebar-индикаторов в статусные строки | Закрыто |
| Нужны отдельные основные маршруты, а не один dashboard | В отчете и e2e зафиксированы `/dashboard`, `/planner`, `/knowledge`, `/review` | Закрыто |
| CRUD должен включать удаление, а не только создание/чтение | В отчете зафиксированы кнопка удаления, API `deleteGoalOnServer` и e2e-сценарий | Закрыто |
| Google OAuth нельзя выдавать за полностью автоматизированный e2e | README честно помечает провайдерский вход как ручную проверку | Закрыто |

### Required fixes

Новых блокирующих frontend-фиксов по просмотренным скриншотам не требуется. Уже выполненные исправления перечислены в `docs/frontend/development_report.md` в разделе `Найденные и исправленные проблемы`.

## Human review и принятое решение

Решение разработчика:

- сохранить текущую светлую dashboard-композицию как основной MVP-экран;
- оставить Mission Control как концепт, а не переносить его темную приборную тему в production UI;
- считать mobile layout достаточным для ДЗ 4, потому что Playwright покрывает mobile usability и в скриншоте нет горизонтального переполнения;
- не заявлять автоматизированный Google OAuth e2e как выполненный, пока провайдерский сценарий остается ручным.

## Результат

| Требование | Evidence |
| --- | --- |
| Frontend реализует цели, задачи, прогресс, AI Review, RAG | `src/features/dashboard/focustrack-dashboard.tsx` |
| Desktop/mobile UI подтверждены визуально | `submissions/hw4/evidence/media/dashboard-*.png` |
| Playwright e2e прошел | `submissions/hw4/evidence/logs/e2e.log` |
| AI-отладка описана в основном отчете | `docs/frontend/development_report.md` |
| Контрольный multimodal evidence добавлен | `submissions/hw4/evidence/multimodal-debugging.md` |

## Ограничения evidence

- Этот файл фиксирует контрольный прогон 20 июня 2026 по текущим скриншотам и коду.
- Он не заменяет Playwright-видео и логи: они остаются первичным evidence прохождения сценариев.
