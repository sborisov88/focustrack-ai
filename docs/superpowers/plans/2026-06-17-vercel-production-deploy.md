# Vercel Production Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть разрыв ДЗ 6: добавить Vercel production deployment для FocusTrack AI, публичный URL, CI deploy job и evidence.

**Architecture:** Frontend деплоится на Vercel как Vite static app. Backend остаётся в Supabase Cloud; OpenRouter остаётся только в Supabase Edge Functions secrets. GitHub Actions выполняет quality gate, затем frontend deploy в Vercel и отдельно условный Supabase deploy для migrations/functions.

**Tech Stack:** Vercel CLI, GitHub Actions, Vite, React, Supabase Cloud, Playwright.

---

### Task 1: Vercel Configuration

**Files:**
- Create: `vercel.json`
- Create: `.vercelignore`

- [x] **Step 1: Add Vercel static app config**

`vercel.json` must set Vite build command, `dist` output directory, install command, and SPA fallback rewrite.

- [x] **Step 2: Exclude local-only artifacts**

`.vercelignore` must exclude `output/`, local evidence media, local env files, and Supabase temp files.

### Task 2: GitHub Actions Deploy

**Files:**
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Add frontend deploy job**

Add `vercel-frontend-deploy` after `quality`, gated by push to `main` and `vars.VERCEL_DEPLOY_ENABLED == 'true'`.

- [x] **Step 2: Use required secrets**

The job uses `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

### Task 3: Production Documentation

**Files:**
- Create: `docs/production-deployment.md`
- Modify: `docs/integrations/integration_documentation.md`
- Modify: `submissions/hw6/README.md`
- Modify: `submissions/final-project/README.md`
- Modify: `README.md`
- Modify: `submissions/acceptance-matrix.md`

- [x] **Step 1: Document Vercel deployment**

Mirror the reference approach: env variables, deploy command, post-deploy smoke, secret safety, rollback.

- [x] **Step 2: Update OTUS status**

Record public frontend URL and deploy evidence paths after successful deploy.

### Task 4: Real Deploy And Verification

**Files:**
- Create/update: `output/verification/logs/vercel-*.log`
- Create/update: `submissions/hw6/evidence/`
- Create/update: `submissions/final-project/evidence/`

- [x] **Step 1: Link Vercel project**

Run `npx vercel link --yes --project focustrack-ai`.

- [x] **Step 2: Configure production env**

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel production from `.env.local` without printing values.

- [x] **Step 3: Deploy production**

Run `npx vercel deploy --prod --yes` and save the deployment URL.

- [x] **Step 4: Verify**

Run local quality gate, Supabase smoke, and Playwright/screenshot against the public URL.
