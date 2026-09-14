-- SQL Editorで実行 / Supabase SQL Editor에서 실행합니다.
-- Existing posts data is preserved. Run once before publishing the admin feature.
begin;
create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 content text not null default '',
 published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.posts alter column published set default false;
alter table public.posts alter column created_at set default now();
alter table public.posts enable row level security;
revoke all on public.posts from anon,authenticated;
grant select on public.posts to anon;
grant select,insert,update,delete on public.posts to authenticated;
drop policy if exists blog_read on public.posts;
drop policy if exists blog_insert on public.posts;
drop policy if exists blog_update on public.posts;
drop policy if exists blog_delete on public.posts;
drop policy if exists blog_read_guard on public.posts;
drop policy if exists blog_write_guard_insert on public.posts;
drop policy if exists blog_write_guard_update on public.posts;
drop policy if exists blog_write_guard_delete on public.posts;
create policy blog_read on public.posts for select to anon,authenticated using
(published=true or (select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
-- Restrictive policies also constrain any pre-existing permissive policies.
create policy blog_read_guard on public.posts as restrictive for select to anon,authenticated using
(published=true or (select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy blog_insert on public.posts for insert to authenticated with check
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy blog_write_guard_insert on public.posts as restrictive for insert to authenticated with check
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy blog_update on public.posts for update to authenticated using
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid) with check
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy blog_write_guard_update on public.posts as restrictive for update to authenticated using
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid) with check
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy blog_delete on public.posts for delete to authenticated using
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy blog_write_guard_delete on public.posts as restrictive for delete to authenticated using
((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
commit;
