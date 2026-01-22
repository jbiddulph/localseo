create table if not exists public.localseo_postcode_cohorts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  postcode text not null,
  keyword text,
  radius_km numeric,
  business_name text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.localseo_postcode_cohorts enable row level security;

create policy "localseo_postcode_cohorts_select_own"
  on public.localseo_postcode_cohorts
  for select
  using (auth.uid() = owner_id);

create policy "localseo_postcode_cohorts_insert_own"
  on public.localseo_postcode_cohorts
  for insert
  with check (auth.uid() = owner_id);

create policy "localseo_postcode_cohorts_update_own"
  on public.localseo_postcode_cohorts
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "localseo_postcode_cohorts_delete_own"
  on public.localseo_postcode_cohorts
  for delete
  using (auth.uid() = owner_id);
