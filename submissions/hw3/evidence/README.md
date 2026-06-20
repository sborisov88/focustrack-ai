# Evidence — ДЗ 3

## Проверенные критерии

- подготовлено описание продукта (личный AI-планировщик целей), UI-концепции, User Stories, ТЗ и ADR;
- UI-концепции связаны с фактическим рабочим экраном дашборда (цели, задачи, прогресс, категории целей, AI Review);
- acceptance criteria оформлены в формате Given/When/Then;
- ТЗ проверено через реализацию MVP и e2e smoke на сквозных жизненных целях (полумарафон, IELTS, финансовая подушка, лендинг пет-проекта).
- AI-процесс генерации UI-концепций зафиксирован в `ai-ui-generation.md`;
- AI-ревью технического задания зафиксировано в `technical-spec-ai-review.md`.

## Проверенные файлы

- `docs/product/project_description.md`
- `docs/product/ui_concepts/ui_description.md`
- `docs/product/user_stories.md`
- `docs/product/technical_specification.md`
- `docs/architecture/adr/001-tech-stack.md`
- `submissions/hw3/evidence/ai-ui-generation.md`
- `submissions/hw3/evidence/technical-spec-ai-review.md`

## AI-process evidence

- `ai-ui-generation.md` — промпт, зафиксированный вывод агента, human review и решение по трем UI-концепциям;
- `technical-spec-ai-review.md` — промпт ревью ТЗ, найденные риски, вердикт готовности для AI-инженера и acceptance checks.

## Логи

- `logs/e2e.log` — рабочий сценарий продукта.
- `logs/build.log` — production build.
- `logs/typecheck.log` — TypeScript-проверка.

## Медиа

Скриншоты сняты с дашборда личного AI-планировщика целей: жизненные цели (полумарафон, IELTS, финансовая подушка, лендинг пет-проекта), задачи, прогресс, блок «Категории целей» и AI Review.

- `media/dashboard-desktop-initial.png` — десктопный дашборд целей в исходном состоянии;
- `media/dashboard-desktop-after-flow.png` — десктопный дашборд после прохождения сценария работы с целью;
- `media/dashboard-mobile.png` — мобильная раскладка дашборда;
- `media/*.webm` — видео Playwright-сценариев по дашборду целей.
