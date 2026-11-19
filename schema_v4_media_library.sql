-- İçerik medyası: Pixabay fotoğrafları, video bağlantıları ve GLB modelleri.
-- schema.sql + schema_v3_visual_storage.sql sonrasında çalıştırın.

alter table public.contents
  add column if not exists visual_type text not null default 'image';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contents_visual_type_check'
      and conrelid = 'public.contents'::regclass
  ) then
    alter table public.contents
      add constraint contents_visual_type_check
      check (visual_type in ('image', 'video', 'model'));
  end if;
end;
$$;

-- Bucket özel kalır; v3'teki işletme sahibi RLS politikaları aynen geçerlidir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visuals',
  'visuals',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'model/gltf-binary', 'model/gltf+json']::text[]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
