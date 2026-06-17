# OTUS Delivery Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Довести FocusTrack AI до проверяемого комплекта сдачи OTUS по ДЗ 1-6 и проектной работе.

**Architecture:** Проект уже собран как React/Vite frontend с Supabase Cloud backend, Edge Functions и OpenRouter через серверные secrets. План не переписывает продукт, а закрывает недостающие сдачные входные точки, архитектурные документы, live-проверки и evidence-папки.

**Tech Stack:** React, TypeScript, Vite, shadcn/ui, Playwright, Vitest, Supabase CLI, Supabase Cloud, PostgreSQL, RLS, Edge Functions, OpenRouter.

---

### Task 1: Requirements Matrix

**Files:**
- Read: `../05 - Российские LLM-решения (GigaCode, YandexGPT). OpenSource для On-premise решений (DeepSeek, Qwen) ДЗ/homework_ext.md`
- Read: `../09 - Практика промптинга. Проработка требований к приложению. Ресерч конкурентов ДЗ/homework_ext.md`
- Read: `../13 - Практика проработка требований с помощью AI-агента ДЗ/homework_ext.md`
- Read: `../19 - Live отладка Frontend'а ДЗ/homework_ext.md`
- Read: `../23 - Live отладка Backend'а ДЗ/homework_ext.md`
- Read: `../27 - Основы RAG Finetuning. Учим приложение отвечать по данным с документов ДЗ/homework_ext.md`
- Read: `../28 - Выбор темы и организация проектной работы Проект/homework_ext.md`
- Create: `submissions/acceptance-matrix.md`

- [ ] **Step 1: Extract acceptance criteria**

Run:

```bash
node - <<'NODE'
const fs = require("fs");
const files = [
  "../05 - Российские LLM-решения (GigaCode, YandexGPT). OpenSource для On-premise решений (DeepSeek, Qwen) ДЗ/homework_ext.md",
  "../09 - Практика промптинга. Проработка требований к приложению. Ресерч конкурентов ДЗ/homework_ext.md",
  "../13 - Практика проработка требований с помощью AI-агента ДЗ/homework_ext.md",
  "../19 - Live отладка Frontend'а ДЗ/homework_ext.md",
  "../23 - Live отладка Backend'а ДЗ/homework_ext.md",
  "../27 - Основы RAG Finetuning. Учим приложение отвечать по данным с документов ДЗ/homework_ext.md",
  "../28 - Выбор темы и организация проектной работы Проект/homework_ext.md"
];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const title = text.match(/^#\s+(.+)$/m)?.[1] ?? file;
  const criteria = text.match(/### Критерии оценки[\s\S]*?(?=\n## |\n---|\n# |$)/)?.[0] ?? "Критерии не найдены";
  console.log(`## ${title}\n${criteria}\n`);
}
NODE
```

Expected: the command prints criteria for ДЗ 1-6 and the project.

- [ ] **Step 2: Write matrix**

Create `submissions/acceptance-matrix.md` with one row per work item and columns `Критерий`, `Артефакт`, `Проверка`, `Evidence`.

### Task 2: Homework 1 Submission Folder

**Files:**
- Create: `submissions/hw1/README.md`
- Ensure: `docs/research/001-ai-tooling/comparison.md`
- Existing: `docs/research/001-ai-tooling/requirements.md`
- Existing: `docs/research/001-ai-tooling/comparison_table.md`
- Existing: `docs/research/001-ai-tooling/tool_selection.md`
- Existing: `docs/research/001-ai-tooling/setup_guide.md`
- Existing: `docs/research/001-ai-tooling/practice_log.md`
- Existing: `docs/research/001-ai-tooling/report.md`

- [ ] **Step 1: Create README**

Write `submissions/hw1/README.md` with the Otus link, artifact table, self-check, verification commands, and ready-to-send message.

- [ ] **Step 2: Create comparison alias**

Write `docs/research/001-ai-tooling/comparison.md` that points reviewers to `comparison_table.md` and preserves the expected assignment naming.

### Task 3: Homework 2 Submission Folder

**Files:**
- Create: `submissions/hw2/README.md`
- Existing: `AGENTS.md`
- Existing: `docs/prompts/hw_ai_rules.md`
- Existing: `docs/prompts/rules.md`
- Existing: `docs/prompts/prompt_templates.md`
- Existing: `docs/prompts/prompt_methodology.md`
- Existing: `docs/prompts/testing.md`

- [ ] **Step 1: Create README**

Write `submissions/hw2/README.md` with the Otus link, artifact table, self-check, and ready-to-send message.

### Task 4: Project Architecture Document

**Files:**
- Create: `docs/architecture/architecture.md`
- Modify: `submissions/final-project/README.md`

- [ ] **Step 1: Create architecture overview**

Write `docs/architecture/architecture.md` with a Mermaid diagram for Frontend -> Supabase -> Edge Functions -> OpenRouter and a short security model.

- [ ] **Step 2: Link project README**

Update `submissions/final-project/README.md` so the Architecture row points to `docs/architecture/architecture.md` and ADR remains a supporting file.

### Task 5: Live Infrastructure Verification

**Files:**
- Read: `.env.local`
- Read: `supabase/config.toml`
- Read: `supabase/functions/_shared/openrouter.ts`
- Update: `submissions/hw5/evidence/README.md`
- Update: `submissions/hw6/evidence/README.md`
- Update: `submissions/final-project/evidence/README.md`

- [ ] **Step 1: Check local tools**

Run:

```bash
node --version
pnpm --version
supabase --version
command -v npx
```

Expected: all tools print versions or paths.

- [ ] **Step 2: Check Supabase project**

Run:

```bash
supabase status --workdir .
supabase projects list
supabase secrets list --project-ref wbxyyvvuqrhqtuywfeto
```

Expected: linked project is available; secret names include `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`; secret values are not printed.

- [ ] **Step 3: Check API endpoints**

Run health and JWT-negative checks through a secret-safe script that prints only HTTP status codes.

Expected: `health=200`, `ai-weekly-review without JWT=401`.

### Task 6: Automated Verification

**Files:**
- Update: `submissions/hw3/evidence/README.md`
- Update: `submissions/hw4/evidence/README.md`
- Update: `submissions/hw5/evidence/README.md`
- Update: `submissions/hw6/evidence/README.md`
- Update: `submissions/final-project/evidence/README.md`

- [ ] **Step 1: Run quality gate**

Run:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm audit --audit-level high
```

Expected: every command exits with code 0.

- [ ] **Step 2: Run Playwright**

Run:

```bash
pnpm run test:e2e
```

Expected: Playwright passes and writes screenshots/videos to `output/playwright/`.

### Task 7: Evidence Packaging

**Files:**
- Update: `submissions/hw1/evidence/README.md`
- Update: `submissions/hw2/evidence/README.md`
- Update: `submissions/hw3/evidence/README.md`
- Update: `submissions/hw4/evidence/README.md`
- Update: `submissions/hw5/evidence/README.md`
- Update: `submissions/hw6/evidence/README.md`
- Update: `submissions/final-project/evidence/README.md`

- [ ] **Step 1: Record evidence per work item**

Each evidence README must list criteria, checked files, commands, result, and links to `output/playwright/` where screenshots/video are relevant.

### Task 8: Course Context And Memory Update

**Files:**
- Modify: `../FOCUSTRACK_AI_WORK_PLAN.md`
- Modify: `../COURSE_HOMEWORK_MAP.md`
- Update: Hindsight bank `otus-ai-agents`

- [ ] **Step 1: Update local plans**

Mark ДЗ 1-6 and project as prepared or verified with the current date and evidence paths.

- [ ] **Step 2: Retain durable fact**

Store a short Hindsight fact with the final status, Supabase project ref, model name, verification commands, and evidence directory.
