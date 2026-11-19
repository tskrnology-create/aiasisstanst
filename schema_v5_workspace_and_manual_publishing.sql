-- Aı Asisst — v5 çoklu marka, manuel paylaşım günlüğü ve veri tutarlılığı
-- schema.sql, v2, v3 ve v4 migration'larından sonra çalıştırın.
-- Bu migration sosyal platformlara otomatik gönderi yayımlamaz.

-- -----------------------------------------------------------------------------
-- Takvim: hedef sosyal hesap ve manuel yayın günlüğü
-- -----------------------------------------------------------------------------
alter table public.calendar_items
  add column if not exists social_account_id uuid references public.social_accounts(id) on delete set null,
  add column if not exists posted_at timestamptz,
  add column if not exists post_url text;

create index if not exists calendar_items_social_account_idx
  on public.calendar_items (business_id, social_account_id, scheduled_at);

DO $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_items_post_url_http_check'
      and conrelid = 'public.calendar_items'::regclass
  ) then
    alter table public.calendar_items
      add constraint calendar_items_post_url_http_check
      check (post_url is null or post_url ~* '^https?://[^[:space:]]+$');
  end if;
end;
$$;

create or replace function public.check_calendar_social_account()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  account_business uuid;
  account_platform public.social_platform;
begin
  if new.social_account_id is null then
    return new;
  end if;

  select business_id, platform
    into account_business, account_platform
    from public.social_accounts
    where id = new.social_account_id;

  if not found or account_business is distinct from new.business_id then
    raise exception 'Hedef sosyal hesap farklı bir markaya ait';
  end if;
  if account_platform is distinct from new.platform then
    raise exception 'Platform, seçilen sosyal hesapla eşleşmiyor';
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_items_social_account_consistency on public.calendar_items;
create trigger calendar_items_social_account_consistency
  before insert or update on public.calendar_items
  for each row execute function public.check_calendar_social_account();

-- -----------------------------------------------------------------------------
-- Atomik sosyal hesap eşitleme: tüm değişiklikler birlikte kaydedilir veya geri alınır.
-- -----------------------------------------------------------------------------
create or replace function public.sync_social_accounts(
  p_business_id uuid,
  p_accounts jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  entry jsonb;
  account_id uuid;
  account_platform public.social_platform;
  account_handle text;
  keep_ids uuid[];
begin
  if jsonb_typeof(p_accounts) is distinct from 'array' then
    raise exception 'Hesap listesi bir JSON dizisi olmalı';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'Bu markaya erişim yetkiniz yok';
  end if;

  select coalesce(array_agg((value->>'id')::uuid), array[]::uuid[])
    into keep_ids
    from jsonb_array_elements(p_accounts) as items(value)
    where nullif(value->>'id', '') is not null;

  -- Aşağıdaki doğrulamalardan biri başarısız olursa işlem iptal edilir, eski satırlar korunur.
  for entry in select value from jsonb_array_elements(p_accounts) as items(value) loop
    account_handle := btrim(coalesce(entry->>'handle', ''));
    if account_handle = '' or length(account_handle) > 200 then
      raise exception 'Sosyal hesap kullanıcı adı boş olamaz ve 200 karakteri aşamaz';
    end if;
    account_platform := (entry->>'platform')::public.social_platform;
    account_id := nullif(entry->>'id', '')::uuid;
    if account_id is not null and not exists (
      select 1 from public.social_accounts sa
      where sa.id = account_id and sa.business_id = p_business_id
    ) then
      raise exception using errcode = '42501', message = 'Sosyal hesap bu markaya ait değil';
    end if;
  end loop;

  delete from public.social_accounts sa
    where sa.business_id = p_business_id
      and not (sa.id = any(keep_ids));

  for entry in select value from jsonb_array_elements(p_accounts) as items(value) loop
    account_handle := btrim(entry->>'handle');
    account_platform := (entry->>'platform')::public.social_platform;
    account_id := nullif(entry->>'id', '')::uuid;

    if account_id is null then
      insert into public.social_accounts (business_id, platform, handle)
      values (p_business_id, account_platform, account_handle);
    else
      update public.social_accounts
        set platform = account_platform,
            handle = account_handle
        where id = account_id and business_id = p_business_id;
      if not found then
        raise exception using errcode = '42501', message = 'Sosyal hesap eşitlenemedi';
      end if;
      update public.calendar_items
        set platform = account_platform
        where business_id = p_business_id
          and social_account_id = account_id
          and platform is distinct from account_platform;
    end if;
  end loop;
end;
$$;

revoke all on function public.sync_social_accounts(uuid, jsonb) from public;
grant execute on function public.sync_social_accounts(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Atomik saatlik üretim rezervasyonu. Sınırlar istemciden değil veritabanından uygulanır:
-- marka başına metin 30/saat, görsel 10/saat.
-- -----------------------------------------------------------------------------
create table if not exists public.generation_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text', 'image')),
  created_at timestamptz not null default now()
);

create index if not exists generation_reservations_business_kind_time_idx
  on public.generation_reservations (business_id, kind, created_at desc);

alter table public.generation_reservations enable row level security;

create or replace function public.reserve_generation(
  p_business_id uuid,
  p_kind text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  business_owner uuid;
  hourly_limit integer;
  current_count integer;
  reservation_id uuid;
begin
  if p_kind = 'text' then
    hourly_limit := 30;
  elsif p_kind = 'image' then
    hourly_limit := 10;
  else
    raise exception 'Üretim türü geçersiz';
  end if;

  select owner_id into business_owner
    from public.businesses
    where id = p_business_id;
  if not found or business_owner is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'Bu markaya erişim yetkiniz yok';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_kind, 0));
  select count(*)::integer into current_count
    from public.generation_reservations
    where business_id = p_business_id
      and kind = p_kind
      and created_at >= now() - interval '1 hour';
  if current_count >= hourly_limit then
    return null;
  end if;

  insert into public.generation_reservations (business_id, owner_id, kind)
  values (p_business_id, business_owner, p_kind)
  returning id into reservation_id;
  return reservation_id;
end;
$$;

create or replace function public.release_generation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.generation_reservations
    where id = p_reservation_id and owner_id = auth.uid();
end;
$$;

revoke all on function public.reserve_generation(uuid, text) from public;
revoke all on function public.release_generation(uuid) from public;
grant execute on function public.reserve_generation(uuid, text) to authenticated;
grant execute on function public.release_generation(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Yeniden denenebilir özel Storage temizliği. Veritabanı silme ve kuyruğa ekleme tek işlemdir;
-- istemci özel nesneleri siler ve başarılı olan kuyruk satırlarını temizler.
-- -----------------------------------------------------------------------------
create table if not exists public.media_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  bucket text not null default 'visuals' check (bucket = 'visuals'),
  object_path text not null,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create index if not exists media_cleanup_queue_business_created_idx
  on public.media_cleanup_queue (business_id, created_at);

alter table public.media_cleanup_queue enable row level security;

drop policy if exists media_cleanup_queue_owner_read on public.media_cleanup_queue;
create policy media_cleanup_queue_owner_read on public.media_cleanup_queue
  for select using (owner_id = auth.uid());

drop policy if exists media_cleanup_queue_owner_delete on public.media_cleanup_queue;
create policy media_cleanup_queue_owner_delete on public.media_cleanup_queue
  for delete using (owner_id = auth.uid());

create or replace function public.delete_content_tree(p_content_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_business_id uuid;
  target_owner_id uuid;
begin
  select c.business_id, b.owner_id
    into target_business_id, target_owner_id
    from public.contents c
    join public.businesses b on b.id = c.business_id
    where c.id = p_content_id;

  if not found or target_owner_id is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'İçeriğe erişim yetkiniz yok';
  end if;

  with recursive content_tree as (
    select c.id, c.business_id, c.visual_url
      from public.contents c
      where c.id = p_content_id and c.business_id = target_business_id
    union all
    select child.id, child.business_id, child.visual_url
      from public.contents child
      join content_tree parent on child.parent_id = parent.id
      where child.business_id = target_business_id
  )
  insert into public.media_cleanup_queue (owner_id, business_id, bucket, object_path)
    select target_owner_id, target_business_id, 'visuals', content_tree.visual_url
      from content_tree
      where content_tree.visual_url is not null
        and content_tree.visual_url !~* '^(https?:|data:|blob:)'
    on conflict (bucket, object_path) do update set created_at = excluded.created_at;

  delete from public.contents
    where id = p_content_id and business_id = target_business_id;
end;
$$;

revoke all on function public.delete_content_tree(uuid) from public;
grant execute on function public.delete_content_tree(uuid) to authenticated;
