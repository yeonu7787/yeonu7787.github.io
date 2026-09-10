-- 새 Supabase 프로젝트의 SQL Editor에서 한 번 실행합니다.
begin;
create table public.blog_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','author'))
);
create unique index single_blog_owner on public.blog_roles(role) where role = 'owner';
create function public.blog_role() returns text language sql stable security definer
set search_path = '' as $$
 select role from public.blog_roles where user_id = (select auth.uid());
$$;
revoke all on function public.blog_role() from public;
grant execute on function public.blog_role() to anon,authenticated;
create table public.pages (
 id text primary key check(id in ('home','about')),
 title text not null check(length(title) between 1 and 200),
 body text not null
);
create table public.entries (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null default auth.uid() references auth.users(id),
 kind text not null check(kind in ('post','project')),
 title text not null check(length(title) between 1 and 200),
 summary text not null default '' check(length(summary)<=500),
 body text not null,
 published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.blog_roles enable row level security;
alter table public.pages enable row level security;
alter table public.entries enable row level security;
revoke all on public.blog_roles,public.pages,public.entries from anon,authenticated;
grant select on public.pages,public.entries to anon;
grant select,insert,update,delete on public.entries to authenticated;
grant select,insert,update on public.pages to authenticated;
grant select,insert,delete on public.blog_roles to authenticated;
create policy roles_read on public.blog_roles for select to authenticated
 using(user_id=auth.uid() or public.blog_role()='owner');
create policy roles_add on public.blog_roles for insert to authenticated
 with check(public.blog_role()='owner' and role='author');
create policy roles_remove on public.blog_roles for delete to authenticated
 using(public.blog_role()='owner' and role='author');
create policy pages_read on public.pages for select to anon,authenticated using(true);
create policy pages_add on public.pages for insert to authenticated with check(public.blog_role()='owner');
create policy pages_edit on public.pages for update to authenticated using(public.blog_role()='owner') with check(public.blog_role()='owner');
create policy entries_read on public.entries for select to anon,authenticated
 using(published or public.blog_role()='owner' or (public.blog_role()='author' and author_id=auth.uid()));
create policy entries_add on public.entries for insert to authenticated
 with check(public.blog_role() in ('owner','author') and author_id=auth.uid());
create policy entries_edit on public.entries for update to authenticated
 using(public.blog_role()='owner' or (public.blog_role()='author' and author_id=auth.uid()))
 with check(public.blog_role()='owner' or (public.blog_role()='author' and author_id=auth.uid()));
create policy entries_delete on public.entries for delete to authenticated
 using(public.blog_role()='owner' or (public.blog_role()='author' and author_id=auth.uid()));
commit;
-- Authentication > Users 에서 본인의 이메일/비밀번호 계정을 생성한 후,
-- 아래 UUID를 본인의 사용자 ID로 바꾸어 SQL Editor에서 별도로 실행합니다.
-- insert into public.blog_roles(user_id,role) values ('본인-사용자-UUID','owner');
-- 브라우저에는 최고 관리자 생성 권한이 없습니다.
