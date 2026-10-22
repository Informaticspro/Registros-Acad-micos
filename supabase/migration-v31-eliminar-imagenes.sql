begin;
create policy laboratory_images_delete on storage.objects for delete to authenticated
using(bucket_id='laboratory-images'
  and (storage.foldername(name))[1]=public.current_profile_organization_id()::text
  and public.current_profile_role()::text in ('propietario','admin','soporte'));
commit;
