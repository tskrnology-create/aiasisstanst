-- Aı Asisst — v8 paylaşım paketi (format + yapılandırılmış içerik)
-- Önceki şemalardan sonra Supabase SQL Editor'de çalıştırın. Yeniden çalıştırılabilir.
-- Bu dosya uygulanmasa da üretim çalışır; yalnızca kanca/slayt/sahne yapısı saklanmaz (düz metin kaydedilir).

alter table public.contents add column if not exists format text;
alter table public.contents add column if not exists package jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contents_format_check') then
    alter table public.contents
      add constraint contents_format_check
      check (format is null or format in ('gonderi', 'karusel', 'video', 'hikaye', 'metin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contents_package_size_check') then
    alter table public.contents
      add constraint contents_package_size_check
      check (package is null or pg_column_size(package) <= 20000) not valid;
  end if;
end;
$$;
