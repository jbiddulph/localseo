create table if not exists public.localseo_tracking_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cohort_id uuid not null references public.localseo_postcode_cohorts(id) on delete cascade,
  frequency text not null check (frequency in ('daily','weekly')),
  day_of_week int check (day_of_week between 0 and 6),
  hour_utc int not null check (hour_utc between 0 and 23),
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists localseo_tracking_schedules_owner_id_idx
  on public.localseo_tracking_schedules(owner_id);

create index if not exists localseo_tracking_schedules_cohort_id_idx
  on public.localseo_tracking_schedules(cohort_id);

alter table public.localseo_tracking_schedules enable row level security;

create policy "localseo_tracking_schedules_select_own"
  on public.localseo_tracking_schedules
  for select
  using (auth.uid() = owner_id);

create policy "localseo_tracking_schedules_insert_own"
  on public.localseo_tracking_schedules
  for insert
  with check (auth.uid() = owner_id);

create policy "localseo_tracking_schedules_update_own"
  on public.localseo_tracking_schedules
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "localseo_tracking_schedules_delete_own"
  on public.localseo_tracking_schedules
  for delete
  using (auth.uid() = owner_id);

revoke all on table public.localseo_tracking_schedules from anon;
revoke all on table public.localseo_tracking_schedules from authenticated;

grant select, insert, update, delete on table public.localseo_tracking_schedules to authenticated;
