-- supabase-community.sql 적용 후 실행하세요.
begin;
create table public.questions(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.member_profiles(user_id),
 title text not null check(char_length(btrim(title)) between 1 and 200),
 body text not null check(char_length(btrim(body)) between 1 and 10000),
 created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
revoke all on public.questions from anon,authenticated;
grant select on public.questions to anon,authenticated;
grant insert,delete on public.questions to authenticated;
grant update(title,body) on public.questions to authenticated;
create policy questions_read on public.questions for select to anon,authenticated using(true);
create policy questions_insert on public.questions for insert to authenticated with check(author_id=auth.uid());
create policy questions_update on public.questions for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy questions_delete on public.questions for delete to authenticated using(author_id=auth.uid() or auth.uid()='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
alter table public.comments alter column post_id drop not null;
alter table public.comments add column question_id uuid references public.questions(id) on delete cascade;
alter table public.comments add column parent_id uuid references public.comments(id) on delete set null;
alter table public.comments add constraint comment_one_target check(num_nonnulls(post_id,question_id)=1);
create index comments_question_date on public.comments(question_id,created_at,id);
create function public.check_reply_target() returns trigger language plpgsql set search_path='' as $$
begin
 if new.parent_id is not null and not exists(
  select 1 from public.comments c where c.id=new.parent_id
  and c.post_id is not distinct from new.post_id
  and c.question_id is not distinct from new.question_id
 ) then raise exception 'Reply must belong to the same post or question'; end if;
 return new;
end;
$$;
create trigger check_reply_target before insert on public.comments for each row execute function public.check_reply_target();
drop policy comment_read on public.comments;
drop policy comment_create on public.comments;
drop policy comment_update on public.comments;
create policy comment_read on public.comments for select to anon,authenticated using
(question_id is not null or exists(select 1 from public.posts p where p.id::text=post_id and p.published=true and p.deleted_at is null) or auth.uid()='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
create policy comment_create on public.comments for insert to authenticated with check
(author_id=auth.uid() and (question_id is not null or exists(select 1 from public.posts p where p.id::text=post_id and p.published=true and p.deleted_at is null)));
create policy comment_update on public.comments for update to authenticated using
(author_id=auth.uid() and (question_id is not null or exists(select 1 from public.posts p where p.id::text=post_id and p.published=true and p.deleted_at is null))) with check(author_id=auth.uid());
commit;
