alter table public.localseo_reports enable row level security;

create policy "localseo_reports_full_access"
  on public.localseo_reports
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on table public.localseo_reports to anon;
grant select, insert, update, delete on table public.localseo_reports to authenticated;
