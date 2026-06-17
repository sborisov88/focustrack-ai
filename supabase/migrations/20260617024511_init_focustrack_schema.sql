create extension if not exists pgcrypto;

create type public.goal_status as enum ('draft', 'active', 'paused', 'completed');
create type public.task_status as enum ('todo', 'doing', 'done', 'blocked');
create type public.task_effort as enum ('S', 'M', 'L');
create type public.ai_session_type as enum ('clarify', 'plan', 'review', 'rag');
create type public.ai_session_status as enum ('queued', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'FocusTrack user',
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '',
  status public.goal_status not null default 'draft',
  target_date date,
  clarified_context jsonb not null default '{}'::jsonb,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 180),
  notes text not null default '',
  effort public.task_effort not null default 'M',
  due_date date,
  status public.task_status not null default 'todo',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  note text not null default ''
);

create table public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  type public.ai_session_type not null,
  provider text not null default 'openrouter',
  model text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  status public.ai_session_status not null default 'queued',
  error_message text,
  created_at timestamptz not null default now()
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text not null,
  recommendations jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source text not null default 'manual',
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.knowledge_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.knowledge_documents(id) on delete set null,
  question text not null,
  answer text not null,
  citations jsonb not null default '[]'::jsonb,
  model text not null,
  created_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals(user_id);
create index goals_status_idx on public.goals(status);
create index tasks_goal_id_idx on public.tasks(goal_id);
create index tasks_user_id_status_idx on public.tasks(user_id, status);
create index task_completions_user_id_idx on public.task_completions(user_id);
create index ai_sessions_user_id_created_at_idx on public.ai_sessions(user_id, created_at desc);
create index weekly_reviews_user_id_week_idx on public.weekly_reviews(user_id, week_start desc);
create index knowledge_documents_user_id_idx on public.knowledge_documents(user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger goals_touch_updated_at
before update on public.goals
for each row execute function public.touch_updated_at();

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_answers enable row level security;

create policy "profiles are readable by owner"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles are writable by owner"
on public.profiles for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "goals are owned by user"
on public.goals for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tasks are owned by user"
on public.tasks for all
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.goals
    where goals.id = tasks.goal_id
      and goals.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.goals
    where goals.id = tasks.goal_id
      and goals.user_id = auth.uid()
  )
);

create policy "task completions are owned by user"
on public.task_completions for all
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.tasks
    where tasks.id = task_completions.task_id
      and tasks.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.tasks
    where tasks.id = task_completions.task_id
      and tasks.user_id = auth.uid()
  )
);

create policy "ai sessions are owned by user"
on public.ai_sessions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "weekly reviews are owned by user"
on public.weekly_reviews for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "knowledge documents are owned by user"
on public.knowledge_documents for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "knowledge answers are owned by user"
on public.knowledge_answers for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.goals,
  public.tasks,
  public.task_completions,
  public.ai_sessions,
  public.weekly_reviews,
  public.knowledge_documents,
  public.knowledge_answers
to authenticated;

grant usage, select on all sequences in schema public to authenticated;
