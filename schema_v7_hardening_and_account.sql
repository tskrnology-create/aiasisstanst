-- Aı Asisst — v7 güvenlik sertleştirmesi ve hesap yaşam döngüsü
-- schema.sql ve v2–v6 sonrasında Supabase SQL Editor'de çalıştırın. Yeniden çalıştırılabilir.

-- 1) v5 fonksiyonlarını anon rolünden de geri al (varsayılan Supabase yetkisi PUBLIC'ten ayrı verilir).
revoke all on function public.sync_social_accounts(uuid, jsonb) from public, anon;
revoke all on function public.reserve_generation(uuid, text) from public, anon;
revoke all on function public.release_generation(uuid) from public, anon;
revoke all on function public.delete_content_tree(uuid) from public, anon;

-- 2) Tetikleyici fonksiyonlarına sabit search_path.
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.check_same_business() set search_path = public, pg_temp;

-- 3) Kullanıcı başına marka sayısı sınırı (marka başı kota bypass'ını önler).
create or replace function public.limit_businesses_per_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.businesses where owner_id = new.owner_id) >= 10 then
    raise exception using errcode = '54000', message = 'En fazla 10 marka oluşturabilirsiniz';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_limit_per_owner on public.businesses;
create trigger businesses_limit_per_owner
  before insert on public.businesses
  for each row execute function public.limit_businesses_per_owner();

-- 4) Harici URI içerebilen model/gltf+json türünü depodan kaldır (yalnızca .glb kabul edilir).
update storage.buckets
   set allowed_mime_types = array_remove(allowed_mime_types, 'model/gltf+json')
 where id = 'visuals';

-- 5) Metin alanlarına makul uzunluk sınırları (mevcut satırları denetlemeden eklenir).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'businesses_text_length_check') then
    alter table public.businesses
      add constraint businesses_text_length_check
      check (
        length(name) <= 200 and length(industry) <= 200
        and length(coalesce(products, '')) <= 4000
        and length(coalesce(target_audience, '')) <= 2000
        and length(coalesce(brand_voice, '')) <= 2000
      ) not valid;
  end if;
end;
$$;

-- 6) Hesabı ve ona bağlı tüm verileri silme (KVKK silme hakkı).
--    auth.users silinince businesses, contents, calendar_items vb. zincirleme silinir.
--    Depodaki dosyalar istemci tarafından önce silinir (AccountPanel).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 7) Eski ve kullanılmayan kota kayıtlarını temizlemek için yardımcı (isteğe bağlı: pg_cron ile çağırın).
create or replace function public.purge_old_generation_reservations()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.generation_reservations where created_at < now() - interval '1 day';
$$;
revoke all on function public.purge_old_generation_reservations() from public, anon, authenticated;
