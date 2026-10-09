create table if not exists public.vilco_marketing_profile (
  id boolean primary key default true check (id),
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.vilco_marketing_profile enable row level security;
revoke all on table public.vilco_marketing_profile from anon, authenticated;
grant select, insert, update, delete on table public.vilco_marketing_profile to service_role;

insert into public.vilco_marketing_profile (id, content)
values (true, '')
on conflict (id) do nothing;
