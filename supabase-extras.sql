-- 기존 setup/media/home SQL 적용 후 실행합니다. 기존 게시글은 보존합니다.
begin;
alter table public.posts add column if not exists category text not null default '일상';
alter table public.posts add column if not exists deleted_at timestamptz;
drop policy if exists posts_trash_guard on public.posts;
create policy posts_trash_guard on public.posts as restrictive for select to anon,authenticated using
((deleted_at is null and published=true) or (select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid);
drop policy if exists post_images_trash_guard on storage.objects;
create policy post_images_trash_guard on storage.objects as restrictive for select to anon,authenticated using
(bucket_id<>'post-images' or (select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid or
exists(select 1 from public.posts p where p.published=true and p.deleted_at is null and storage.objects.name=any(p.images)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-images','profile-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists profile_insert on storage.objects;
drop policy if exists profile_insert_guard on storage.objects;
drop policy if exists profile_update_guard on storage.objects;
drop policy if exists profile_delete_guard on storage.objects;
create policy profile_insert on storage.objects for insert to authenticated with check
(bucket_id='profile-images' and (select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid and
(storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_insert_guard on storage.objects as restrictive for insert to anon,authenticated with check
(bucket_id<>'profile-images' or ((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid and (storage.foldername(name))[1]=(select auth.uid())::text));
create policy profile_update_guard on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'profile-images') with check(bucket_id<>'profile-images');
create policy profile_delete_guard on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'profile-images');
commit;
