revoke all on table public.localseo_postcode_cohorts from anon;
revoke all on table public.localseo_postcode_cohorts from authenticated;

grant select, insert, update, delete on table public.localseo_postcode_cohorts to authenticated;
