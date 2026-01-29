create table if not exists public.localseo_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cohort_id uuid not null references public.localseo_postcode_cohorts(id) on delete cascade,
  slug text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists localseo_reports_owner_id_idx
  on public.localseo_reports(owner_id);

create index if not exists localseo_reports_cohort_id_idx
  on public.localseo_reports(cohort_id);

alter table public.localseo_reports enable row level security;

create policy "localseo_reports_select_own"
  on public.localseo_reports
  for select
  using (auth.uid() = owner_id);

create policy "localseo_reports_insert_own"
  on public.localseo_reports
  for insert
  with check (auth.uid() = owner_id);

create policy "localseo_reports_update_own"
  on public.localseo_reports
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "localseo_reports_delete_own"
  on public.localseo_reports
  for delete
  using (auth.uid() = owner_id);

revoke all on table public.localseo_reports from anon;
revoke all on table public.localseo_reports from authenticated;

grant select, insert, update, delete on table public.localseo_reports to authenticated;
