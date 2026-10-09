create table if not exists public.vilco_app_state (
  app_key text primary key check (app_key = 'workspace'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.vilco_app_state enable row level security;
revoke all on table public.vilco_app_state from anon, authenticated;
grant select, insert, update, delete on table public.vilco_app_state to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vilco-media', 'vilco-media', false, 52428800, null)
on conflict (id) do update
set public = false, file_size_limit = 52428800, allowed_mime_types = null;