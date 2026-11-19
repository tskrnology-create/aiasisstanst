-- İçerik kütüphanesinde saklanan görseller için özel Supabase Storage bucket.
-- Supabase SQL Editor'de schema.sql ve schema_v2_image_usage.sql sonrasında çalıştırın.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visuals', 'visuals', false, 12582912, array['image/png']::text[])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "visuals: işletme sahibi görselleri okuyabilir" on storage.objects;
create policy "visuals: işletme sahibi görselleri okuyabilir"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'visuals'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );

drop policy if exists "visuals: işletme sahibi görsel yükleyebilir" on storage.objects;
create policy "visuals: işletme sahibi görsel yükleyebilir"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'visuals'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );

drop policy if exists "visuals: işletme sahibi görsel silebilir" on storage.objects;
create policy "visuals: işletme sahibi görsel silebilir"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'visuals'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );
