create table if not exists public.localseo_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.localseo_postcode_cohorts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  postcode text not null,
  radius_km numeric,
  center_lat numeric,
  center_lng numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.localseo_rank_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.localseo_rank_snapshots(id) on delete cascade,
  place_id text not null,
  name text not null,
  rank integer not null,
  rating numeric,
  user_ratings_total integer,
  vicinity text,
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now()
);

create index if not exists localseo_rank_snapshots_owner_id_idx
  on public.localseo_rank_snapshots(owner_id);

create index if not exists localseo_rank_snapshots_cohort_id_idx
  on public.localseo_rank_snapshots(cohort_id);

create index if not exists localseo_rank_snapshot_items_snapshot_id_idx
  on public.localseo_rank_snapshot_items(snapshot_id);

alter table public.localseo_rank_snapshots enable row level security;
alter table public.localseo_rank_snapshot_items enable row level security;

create policy "localseo_rank_snapshots_select_own"
  on public.localseo_rank_snapshots
  for select
  using (auth.uid() = owner_id);

create policy "localseo_rank_snapshots_insert_own"
  on public.localseo_rank_snapshots
  for insert
  with check (auth.uid() = owner_id);

create policy "localseo_rank_snapshots_update_own"
  on public.localseo_rank_snapshots
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "localseo_rank_snapshots_delete_own"
  on public.localseo_rank_snapshots
  for delete
  using (auth.uid() = owner_id);

create policy "localseo_rank_snapshot_items_select_own"
  on public.localseo_rank_snapshot_items
  for select
  using (
    exists (
      select 1
      from public.localseo_rank_snapshots snapshots
      where snapshots.id = snapshot_id
        and snapshots.owner_id = auth.uid()
    )
  );

create policy "localseo_rank_snapshot_items_insert_own"
  on public.localseo_rank_snapshot_items
  for insert
  with check (
    exists (
      select 1
      from public.localseo_rank_snapshots snapshots
      where snapshots.id = snapshot_id
        and snapshots.owner_id = auth.uid()
    )
  );

create policy "localseo_rank_snapshot_items_update_own"
  on public.localseo_rank_snapshot_items
  for update
  using (
    exists (
      select 1
      from public.localseo_rank_snapshots snapshots
      where snapshots.id = snapshot_id
        and snapshots.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.localseo_rank_snapshots snapshots
      where snapshots.id = snapshot_id
        and snapshots.owner_id = auth.uid()
    )
  );

create policy "localseo_rank_snapshot_items_delete_own"
  on public.localseo_rank_snapshot_items
  for delete
  using (
    exists (
      select 1
      from public.localseo_rank_snapshots snapshots
      where snapshots.id = snapshot_id
        and snapshots.owner_id = auth.uid()
    )
  );

revoke all on table public.localseo_rank_snapshots from anon;
revoke all on table public.localseo_rank_snapshots from authenticated;
revoke all on table public.localseo_rank_snapshot_items from anon;
revoke all on table public.localseo_rank_snapshot_items from authenticated;

grant select, insert, update, delete on table public.localseo_rank_snapshots to authenticated;
grant select, insert, update, delete on table public.localseo_rank_snapshot_items to authenticated;
