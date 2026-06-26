# Release notes

## 0.1.0 — MVP candidate

### Added

- shadcn dashboard for goals, tasks, weekly review and RAG docs;
- Supabase schema with RLS;
- Edge Functions for AI clarify, plan, weekly review, RAG and health with database reachability check;
- OpenRouter server-side integration;
- Google OAuth entry point through Supabase Auth;
- analytics event helper;
- Vitest unit tests;
- Playwright e2e with screenshots and video;
- GitHub Actions quality gate;
- Supabase grants hardening: `anon` table access revoked, AI/RAG Edge Functions require JWT.

### Known limitations

- authenticated users load and mutate their workspace through Supabase; signed-out users can still open a local demo workspace;
- health endpoint is public for smoke checks and uses restricted CORS; AI/RAG calls require a user JWT;
- Yandex ID, alerts and deployment secrets must be configured in provider dashboards.
