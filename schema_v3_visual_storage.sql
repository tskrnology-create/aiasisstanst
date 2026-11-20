-- İçerik kütüphanesinde saklanan görseller ve videolar için özel Supabase Storage bucket.
-- Supabase SQL Editor'de schema.sql ve schema_v2_image_usage.sql sonrasında çalıştırın.
-- Yeniden çalıştırılabilir: visuals bucket'ını ve sahiplik RLS politikalarını günceller.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visuals', 'visuals', false, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'model/gltf-binary', 'model/gltf+json']::text[])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS içinde businesses tablosunun kendi RLS görünürlüğüne takılmadan
-- yalnızca geçerli kullanıcının sahip olduğu marka klasörünü doğrular.
create or replace function public.is_visual_business_owner(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id::text = p_folder
      and b.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_visual_business_owner(text) from public, anon;
grant execute on function public.is_visual_business_owner(text) to authenticated;

drop policy if exists "visuals: işletme sahibi görselleri okuyabilir" on storage.objects;
create policy "visuals: işletme sahibi görselleri okuyabilir"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'visuals'
    and public.is_visual_business_owner((storage.foldername(name))[1])
  );

drop policy if exists "visuals: işletme sahibi görsel yükleyebilir" on storage.objects;
create policy "visuals: işletme sahibi görsel yükleyebilir"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'visuals'
    and public.is_visual_business_owner((storage.foldername(name))[1])
  );

drop policy if exists "visuals: işletme sahibi görsel silebilir" on storage.objects;
create policy "visuals: işletme sahibi görsel silebilir"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'visuals'
    and public.is_visual_business_owner((storage.foldername(name))[1])
  );
