begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('laboratory-images','laboratory-images',false,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do nothing;

create policy laboratory_images_read on storage.objects for select to authenticated
using(bucket_id='laboratory-images'
  and (storage.foldername(name))[1]=public.current_profile_organization_id()::text
  and public.current_profile_role()::text in ('propietario','admin','soporte'));

create policy laboratory_images_upload on storage.objects for insert to authenticated
with check(bucket_id='laboratory-images'
  and (storage.foldername(name))[1]=public.current_profile_organization_id()::text
  and public.current_profile_role()::text in ('propietario','admin','soporte'));
commit;
