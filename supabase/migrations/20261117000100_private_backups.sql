begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pani-backups', 'pani-backups', false, 5593000, array['application/json'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Pani owner selects backups" on storage.objects
  for select to authenticated using (
    bucket_id = 'pani-backups' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Pani owner inserts backups" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'pani-backups' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Pani owner deletes backups" on storage.objects
  for delete to authenticated using (
    bucket_id = 'pani-backups' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

commit;
