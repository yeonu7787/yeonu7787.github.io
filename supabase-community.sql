-- 기존 posts/setup/media/extras 설정 후 Supabase SQL Editor에서 실행
begin;
create table public.member_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check(nickname ~ '^[가-힣A-Za-z0-9_]{2,20}$')
);
create unique index unique_member_nickname on public.member_profiles(lower(nickname));
alter table public.member_profiles enable row level security;
revoke all on public.member_profiles from anon,authenticated;
grant select on public.member_profiles to anon,authenticated;
grant insert on public.member_profiles to authenticated;
grant update(nickname) on public.member_profiles to authenticated;
create policy member_read on public.member_profiles for select to anon,authenticated using(true);
create policy member_create on public.member_profiles for insert to authenticated with check(user_id=auth.uid());
create policy member_update on public.member_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create table public.comments(
 id uuid primary key default gen_random_uuid(),
 post_id text not null,
 author_id uuid not null references public.member_profiles(user_id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index comments_post_date on public.comments(post_id,created_at,id);
alter table public.comments enable row level security;
revoke all on public.comments from anon,authenticated;
grant select on public.comments to anon,authenticated;
grant insert,delete on public.comments to authenticated;
grant update(body) on public.comments to authenticated;
create policy comment_read on public.comments for select to anon,authenticated using
(exists(select 1 from public.posts p where p.id::text=post_id and p.published=true and p.deleted_at is null)
or auth.uid()='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy comment_create on public.comments for insert to authenticated with check
(author_id=auth.uid() and exists(select 1 from public.posts p where p.id::text=post_id and p.published=true and p.deleted_at is null));
create policy comment_update on public.comments for update to authenticated using
(author_id=auth.uid() and exists(select 1 from public.posts p where p.id::text=post_id and p.published=true and p.deleted_at is null))
with check(author_id=auth.uid());
create policy comment_delete on public.comments for delete to authenticated using
(author_id=auth.uid() or auth.uid()='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
commit;
