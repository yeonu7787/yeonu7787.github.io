-- 먼저 supabase-setup.sql을 적용한 후 이 파일을 SQL Editor에서 실행하세요.
begin;
alter table public.posts add column if not exists summary text not null default '';
alter table public.posts add column if not exists images text[] not null default '{}';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('post-images','post-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists post_images_read on storage.objects;
drop policy if exists post_images_read_guard on storage.objects;
drop policy if exists post_images_insert on storage.objects;
drop policy if exists post_images_insert_guard on storage.objects;
drop policy if exists post_images_update_guard on storage.objects;
drop policy if exists post_images_delete_guard on storage.objects;
create policy post_images_read on storage.objects for select to anon,authenticated using
(bucket_id='post-images' and (
(select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid
or exists(select 1 from public.posts p where p.published=true and storage.objects.name=any(p.images))));
create policy post_images_read_guard on storage.objects as restrictive for select to anon,authenticated using
(bucket_id<>'post-images' or (select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid
or exists(select 1 from public.posts p where p.published=true and storage.objects.name=any(p.images)));
create policy post_images_insert on storage.objects for insert to authenticated with check
(bucket_id='post-images' and (select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid
and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy post_images_insert_guard on storage.objects as restrictive for insert to anon,authenticated with check
(bucket_id<>'post-images' or ((select auth.uid())='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4'::uuid
and (storage.foldername(name))[1]=(select auth.uid())::text));
create policy post_images_update_guard on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'post-images') with check(bucket_id<>'post-images');
create policy post_images_delete_guard on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'post-images');
commit;
-- Uploads use unique immutable paths. Removing an image from a post does not delete its file.
