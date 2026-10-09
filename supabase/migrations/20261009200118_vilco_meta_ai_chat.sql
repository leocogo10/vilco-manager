create table if not exists public.vilco_meta_chat (
  id boolean primary key default true check (id),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.vilco_meta_chat enable row level security;
revoke all on table public.vilco_meta_chat from anon, authenticated;
grant select, insert, update, delete on table public.vilco_meta_chat to service_role;

insert into public.vilco_meta_chat (id, messages)
values (true, '[]'::jsonb)
on conflict (id) do nothing;
