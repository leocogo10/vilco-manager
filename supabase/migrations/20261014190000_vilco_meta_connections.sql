create table if not exists public.vilco_meta_connections (
  id text primary key check (id = 'workspace'),
  token_ciphertext text not null,
  page_id text not null,
  page_name text not null,
  instagram_user_id text,
  instagram_username text,
  updated_at timestamptz not null default now()
);

alter table public.vilco_meta_connections enable row level security;
revoke all privileges on table public.vilco_meta_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.vilco_meta_connections to service_role;

