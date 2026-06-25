create extension if not exists vector with schema extensions;

alter table public.knowledge_documents
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists embedding_status text not null default 'pending',
  add column if not exists embedding_error text,
  add column if not exists embedded_at timestamptz,
  add column if not exists content_hash text;

do $$
begin
  alter table public.knowledge_documents
    add constraint knowledge_documents_embedding_status_check
    check (embedding_status in ('pending', 'indexing', 'ready', 'failed'));
exception
  when duplicate_object then null;
end $$;

create trigger knowledge_documents_touch_updated_at
before update on public.knowledge_documents
for each row execute function public.touch_updated_at();

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 5000),
  content_hash text not null,
  embedding extensions.vector(1024) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create trigger knowledge_chunks_touch_updated_at
before update on public.knowledge_chunks
for each row execute function public.touch_updated_at();

alter table public.knowledge_chunks enable row level security;

create policy "knowledge chunks are owned by user"
on public.knowledge_chunks for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.knowledge_documents
    where knowledge_documents.id = knowledge_chunks.document_id
      and knowledge_documents.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.knowledge_documents
    where knowledge_documents.id = knowledge_chunks.document_id
      and knowledge_documents.user_id = (select auth.uid())
  )
);

create index if not exists knowledge_chunks_user_id_idx
  on public.knowledge_chunks(user_id);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks(document_id);

create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(1024),
  match_threshold double precision default 0.55,
  match_count integer default 6,
  filter_document_id uuid default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  source text,
  content text,
  similarity double precision,
  chunk_index integer,
  metadata jsonb
)
language sql
stable
set search_path = public, extensions
as $$
  select
    knowledge_chunks.id as chunk_id,
    knowledge_chunks.document_id,
    knowledge_documents.title,
    knowledge_documents.source,
    knowledge_chunks.content,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity,
    knowledge_chunks.chunk_index,
    knowledge_chunks.metadata
  from public.knowledge_chunks
  join public.knowledge_documents
    on knowledge_documents.id = knowledge_chunks.document_id
  where knowledge_chunks.user_id = (select auth.uid())
    and knowledge_documents.user_id = (select auth.uid())
    and (filter_document_id is null or knowledge_chunks.document_id = filter_document_id)
    and 1 - (knowledge_chunks.embedding <=> query_embedding) >= match_threshold
  order by knowledge_chunks.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50)
$$;

grant select, insert, update, delete on public.knowledge_chunks to authenticated;
grant execute on function public.match_knowledge_chunks(
  extensions.vector(1024),
  double precision,
  integer,
  uuid
) to authenticated;
