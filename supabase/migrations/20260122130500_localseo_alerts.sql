create table if not exists public.localseo_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cohort_id uuid not null references public.localseo_postcode_cohorts(id) on delete cascade,
  snapshot_id uuid references public.localseo_rank_snapshots(id) on delete set null,
  alert_type text not null,
  severity text not null check (severity in ('low','medium','high')),
  message text not null,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists localseo_alerts_owner_id_idx
  on public.localseo_alerts(owner_id);

create index if not exists localseo_alerts_cohort_id_idx
  on public.localseo_alerts(cohort_id);

alter table public.localseo_alerts enable row level security;

create policy "localseo_alerts_select_own"
  on public.localseo_alerts
  for select
  using (auth.uid() = owner_id);

create policy "localseo_alerts_insert_own"
  on public.localseo_alerts
  for insert
  with check (auth.uid() = owner_id);

create policy "localseo_alerts_update_own"
  on public.localseo_alerts
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "localseo_alerts_delete_own"
  on public.localseo_alerts
  for delete
  using (auth.uid() = owner_id);

revoke all on table public.localseo_alerts from anon;
revoke all on table public.localseo_alerts from authenticated;

grant select, insert, update, delete on table public.localseo_alerts to authenticated;
