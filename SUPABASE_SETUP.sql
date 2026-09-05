-- Mampfo v0.6.1 – Supabase Grundschema
-- Im SQL Editor eines EIGENEN Mampfo-Supabase-Projekts ausführen.
-- Alle Tabellen sind per RLS auf den jeweils angemeldeten Benutzer begrenzt.

create table if not exists public.mampfo_food_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  record_updated_at timestamptz,
  deleted_at timestamptz,
  cloud_updated_at timestamptz not null default now(),
  primary key (user_id, record_id)
);

create table if not exists public.mampfo_saved_foods (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  record_updated_at timestamptz,
  deleted_at timestamptz,
  cloud_updated_at timestamptz not null default now(),
  primary key (user_id, record_id)
);

create table if not exists public.mampfo_recipes (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  record_updated_at timestamptz,
  deleted_at timestamptz,
  cloud_updated_at timestamptz not null default now(),
  primary key (user_id, record_id)
);

create table if not exists public.mampfo_fast_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  record_updated_at timestamptz,
  deleted_at timestamptz,
  cloud_updated_at timestamptz not null default now(),
  primary key (user_id, record_id)
);

create table if not exists public.mampfo_fasting_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  record_updated_at timestamptz,
  deleted_at timestamptz,
  cloud_updated_at timestamptz not null default now(),
  primary key (user_id, record_id)
);

create table if not exists public.mampfo_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  record_updated_at timestamptz,
  cloud_updated_at timestamptz not null default now()
);

create table if not exists public.mampfo_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initialized_at timestamptz not null default now(),
  source_device_id text,
  app_version text,
  schema_version integer not null default 1,
  cloud_updated_at timestamptz not null default now()
);

alter table public.mampfo_food_entries enable row level security;
alter table public.mampfo_saved_foods enable row level security;
alter table public.mampfo_recipes enable row level security;
alter table public.mampfo_fast_plans enable row level security;
alter table public.mampfo_fasting_sessions enable row level security;
alter table public.mampfo_user_settings enable row level security;
alter table public.mampfo_sync_state enable row level security;

-- Keine Cloud-Daten für nicht angemeldete Besucher.
revoke all on table public.mampfo_food_entries from anon, authenticated;
revoke all on table public.mampfo_saved_foods from anon, authenticated;
revoke all on table public.mampfo_recipes from anon, authenticated;
revoke all on table public.mampfo_fast_plans from anon, authenticated;
revoke all on table public.mampfo_fasting_sessions from anon, authenticated;
revoke all on table public.mampfo_user_settings from anon, authenticated;
revoke all on table public.mampfo_sync_state from anon, authenticated;

grant select, insert, update, delete on table public.mampfo_food_entries to authenticated;
grant select, insert, update, delete on table public.mampfo_saved_foods to authenticated;
grant select, insert, update, delete on table public.mampfo_recipes to authenticated;
grant select, insert, update, delete on table public.mampfo_fast_plans to authenticated;
grant select, insert, update, delete on table public.mampfo_fasting_sessions to authenticated;
grant select, insert, update, delete on table public.mampfo_user_settings to authenticated;
grant select, insert, update, delete on table public.mampfo_sync_state to authenticated;

-- Policies werden für wiederholbares Setup zuerst entfernt und anschließend neu angelegt.
do $$
declare
  t text;
begin
  foreach t in array array[
    'mampfo_food_entries','mampfo_saved_foods','mampfo_recipes','mampfo_fast_plans',
    'mampfo_fasting_sessions','mampfo_user_settings','mampfo_sync_state'
  ] loop
    execute format('drop policy if exists mampfo_select_own on public.%I', t);
    execute format('drop policy if exists mampfo_insert_own on public.%I', t);
    execute format('drop policy if exists mampfo_update_own on public.%I', t);
    execute format('drop policy if exists mampfo_delete_own on public.%I', t);

    execute format('create policy mampfo_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy mampfo_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy mampfo_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy mampfo_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
