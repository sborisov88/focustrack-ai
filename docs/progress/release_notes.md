# Release notes

## 0.1.0 — MVP candidate

### Added

- shadcn dashboard for goals, tasks, weekly review and RAG docs;
- Supabase schema with RLS;
- Edge Functions for AI clarify, plan, weekly review, RAG and health;
- OpenRouter server-side integration;
- Google OAuth entry point through Supabase Auth;
- analytics event helper;
- Vitest unit tests;
- Playwright e2e with screenshots and video;
- GitHub Actions quality gate;
- Supabase grants hardening: `anon` table access revoked, AI/RAG Edge Functions require JWT.

### Known limitations

- full authenticated data loading is prepared by schema/API but demo UI still uses local workspace fallback;
- health endpoint is public for smoke checks; AI/RAG calls require a user JWT;
- Yandex ID, alerts and deployment secrets must be configured in provider dashboards.
