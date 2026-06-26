create table public.function_invocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  function_name text not null check (
    function_name in (
      'ai-clarify',
      'ai-plan',
      'ai-weekly-review',
      'rag-answer',
      'embed-knowledge-document'
    )
  ),
  status text not null default 'accepted' check (
    status in ('accepted', 'blocked', 'failed')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index function_invocations_user_fn_created_idx
on public.function_invocations(user_id, function_name, created_at desc);

alter table public.function_invocations enable row level security;

create policy function_invocations_owner_select
on public.function_invocations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy function_invocations_owner_insert
on public.function_invocations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

revoke all on public.function_invocations from anon;
grant select, insert on public.function_invocations to authenticated;
