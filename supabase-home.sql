begin;
create table if not exists public.site_profile(
 id text primary key check(id='home'),
 data jsonb not null check(jsonb_typeof(data)='object')
);
alter table public.site_profile enable row level security;
revoke all on public.site_profile from anon,authenticated;
grant select on public.site_profile to anon,authenticated;
grant insert,update on public.site_profile to authenticated;
drop policy if exists home_read on public.site_profile;
drop policy if exists home_insert on public.site_profile;
drop policy if exists home_update on public.site_profile;
create policy home_read on public.site_profile for select to anon,authenticated using(true);
create policy home_insert on public.site_profile for insert to authenticated with check((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy home_update on public.site_profile for update to authenticated using((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid) with check((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
commit;
