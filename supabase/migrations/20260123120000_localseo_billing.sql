create table if not exists public.localseo_customers (
  id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.localseo_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  price_id text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  trial_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists localseo_subscriptions_owner_id_idx
  on public.localseo_subscriptions(owner_id);

alter table public.localseo_customers enable row level security;
alter table public.localseo_subscriptions enable row level security;

create policy "localseo_customers_select_own"
  on public.localseo_customers
  for select
  using (auth.uid() = id);

create policy "localseo_customers_insert_own"
  on public.localseo_customers
  for insert
  with check (auth.uid() = id);

create policy "localseo_customers_update_own"
  on public.localseo_customers
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "localseo_subscriptions_select_own"
  on public.localseo_subscriptions
  for select
  using (auth.uid() = owner_id);

create policy "localseo_subscriptions_insert_own"
  on public.localseo_subscriptions
  for insert
  with check (auth.uid() = owner_id);

create policy "localseo_subscriptions_update_own"
  on public.localseo_subscriptions
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

revoke all on table public.localseo_customers from anon;
revoke all on table public.localseo_customers from authenticated;
revoke all on table public.localseo_subscriptions from anon;
revoke all on table public.localseo_subscriptions from authenticated;

grant select, insert, update on table public.localseo_customers to authenticated;
grant select, insert, update on table public.localseo_subscriptions to authenticated;
