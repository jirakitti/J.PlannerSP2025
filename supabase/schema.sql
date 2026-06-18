create table if not exists public.user_app_state (
  id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

create policy "Users can read their own app state"
on public.user_app_state
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own app state"
on public.user_app_state
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own app state"
on public.user_app_state
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
