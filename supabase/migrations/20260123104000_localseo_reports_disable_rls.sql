alter table public.localseo_reports disable row level security;

grant all privileges on table public.localseo_reports to anon;
grant all privileges on table public.localseo_reports to authenticated;
