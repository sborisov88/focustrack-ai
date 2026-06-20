# AI-process evidence: генерация UI-концепций

Дата фиксации: 20 июня 2026.
HEAD проверки: `9c13573`.

Этот файл фиксирует контрольный AI-process evidence для ДЗ 3: как AI использовался при генерации и сравнении UI-концепций FocusTrack AI. Это не попытка задним числом выдать пересказ за исторический лог: ниже сохранен воспроизводимый контрольный прогон по текущим артефактам репозитория.

## Связь с критерием

Критерий ДЗ 3: подготовить не менее трех разных UI-концепций и обосновать выбор направления для MVP.

Проверяемые артефакты:

- `docs/product/ui_concepts/ui_description.md`;
- `src/features/concepts/`;
- маршруты `/concepts`, `/concepts/compass`, `/concepts/mission`, `/concepts/journal`;
- `submissions/hw3/evidence/media/concept-1-compass-desktop.png`;
- `submissions/hw3/evidence/media/concept-1-compass-mobile.png`;
- `submissions/hw3/evidence/media/concept-2-mission-control-desktop.png`;
- `submissions/hw3/evidence/media/concept-2-mission-control-mobile.png`;
- `submissions/hw3/evidence/media/concept-3-field-journal-desktop.png`;
- `submissions/hw3/evidence/media/concept-3-field-journal-mobile.png`.

## Промпт

```text
Role: product designer and frontend prototyper for FocusTrack AI.
Task: generate three distinct UI concepts for a personal AI goal planner.
Context:
- Product: FocusTrack AI.
- Core scenarios: create a goal, clarify it with AI, generate a plan, track tasks,
  view progress, receive weekly AI review, ask RAG questions over personal notes.
- Demo goals: first half-marathon, IELTS 7.0, six-month financial cushion,
  pet-project landing page.
- The result must be implementable in React and must not be a landing page.
Format:
- concept name;
- layout and information architecture;
- visual language;
- signature UI element;
- strongest use case;
- risks and tradeoffs;
- recommendation for MVP.
```

## Зафиксированный вывод агента

### Концепция 1: Compass / Minimal Focus

- Основной тезис: один главный курс на сегодня, минимальная когнитивная нагрузка.
- Компоновка: центрированная структура с главным фокусом, списком ориентиров и AI-ревью.
- Сигнатура: круговой compass-gauge, где цели представлены как направления движения.
- Риск: меньше аналитической плотности, слабее демонстрирует весь backend/AI слой.

### Концепция 2: Mission Control / Dashboard Heavy

- Основной тезис: центр управления всеми целями, задачами и AI-сессиями.
- Компоновка: плотная сетка из карточек целей, очереди задач, AI-журнала, weekly review и RAG-корпуса.
- Сигнатура: телеметрийные тайлы с gauge, sparkline и статусами по каждой цели.
- Риск: высокая плотность информации требует аккуратной адаптивной сетки.

### Концепция 3: Field Journal / Mobile Coach

- Основной тезис: персональный журнал пути и AI-коуч вместо сухой панели метрик.
- Компоновка: mobile-first таймлайн целей, заметки, тред коуча и RAG-вопросы.
- Сигнатура: маршрут из вейпоинтов и нарративные сообщения AI-коуча.
- Риск: хуже подходит для демонстрации всех продуктовых и backend-артефактов на широком экране.

### Рекомендация агента

Для MVP выбрать гибрид Mission Control и Compass: сохранить обзорность Mission Control, но в рабочем продукте оставить более спокойную светлую поверхность и фокус на выбранной цели. Field Journal оставить как направление для будущей мобильной итерации.

## Human review и принятое решение

Решение разработчика:

- все три концепции реализованы как живые прототипы в `src/features/concepts/`, а не только как текстовое описание;
- для MVP выбрана гибридная модель: текущий рабочий экран в `src/features/dashboard/focustrack-dashboard.tsx` использует обзорную структуру Mission Control, но без темной приборной стилистики;
- концепты сохранены в репозитории, потому что они показывают реальный выбор между разными продуктовыми направлениями;
- скриншоты desktop/mobile вынесены в `submissions/hw3/evidence/media/`, чтобы проверяющий видел не только итоговый продукт, но и дизайн-процесс.

## Результат

| Требование | Как закрыто |
| --- | --- |
| Не менее 3 UI-концепций | Compass, Mission Control, Field Journal |
| Разные стиль и компоновка | минимальный фокус, плотный dashboard, mobile-first журнал |
| Визуальные артефакты | desktop/mobile PNG по каждой концепции |
| Живые прототипы | маршруты `/concepts/*` |
| Обоснование выбора | раздел `## Выбор` в `docs/product/ui_concepts/ui_description.md` |

## Ограничения evidence

- Файл фиксирует контрольный AI-process evidence на текущем состоянии репозитория.
- Он не подменяет исходные скриншоты, код и описание концепций: первичные артефакты остаются в `docs/product/ui_concepts/`, `src/features/concepts/` и `submissions/hw3/evidence/media/`.
