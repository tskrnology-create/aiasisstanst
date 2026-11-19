-- AI Business Assistant — v1 veri modeli (Supabase / PostgreSQL)
-- Çalıştırma: Supabase Dashboard > SQL Editor

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Enum tipleri
-- ---------------------------------------------------------------
create type content_language as enum ('tr', 'en');
create type content_status    as enum ('draft', 'approved', 'archived');
create type social_platform   as enum ('instagram', 'tiktok', 'facebook', 'x', 'linkedin', 'youtube', 'other');

-- ---------------------------------------------------------------
-- 1) businesses — Modül 1 (Business Profile)
-- owner_id: giriş yapan kullanıcı. Bir kullanıcı (ör. ajans) birden
-- fazla işletmeye sahip olabilir; çok kullanıcılı ekip yönetimi v1'de yok.
-- ---------------------------------------------------------------
create table businesses (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  industry         text not null,                 -- sektör
  products         text,                          -- ürün ve hizmetler (serbest metin)
  target_audience  text,                          -- hedef kitle
  brand_voice      text,                          -- marka dili (ör. samimi, profesyonel, esprili)
  brand_colors     text[] not null default '{}',  -- hex kodları: {'#E91E63','#FFFFFF'}
  logo_url         text,                          -- Supabase Storage yolu
  content_language content_language not null default 'tr',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index businesses_owner_idx on businesses(owner_id);

-- ---------------------------------------------------------------
-- 2) social_accounts — sadece kayıt, API bağlantısı yok (v1)
-- ---------------------------------------------------------------
create table social_accounts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  platform     social_platform not null,
  handle       text not null,                     -- kullanıcı adı veya profil URL'si
  created_at   timestamptz not null default now(),
  unique (business_id, platform, handle)
);
create index social_accounts_business_idx on social_accounts(business_id);

-- ---------------------------------------------------------------
-- 3) contents — Modül 2 + 5 (üretim ve kütüphane)
-- Bir istek birden fazla kayıt üretebilir: ana içerik + farklı ton
-- alternatifleri. Alternatifler parent_id ile ana içeriğe bağlanır.
-- ---------------------------------------------------------------
create table contents (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  parent_id     uuid references contents(id) on delete cascade,
  prompt        text not null,                    -- kullanıcının isteği
  tone          text,                             -- ör. 'samimi', 'resmi', 'esprili'
  language      content_language not null,
  post_text     text,                             -- gönderi metni
  caption       text,
  hashtags      text[] not null default '{}',
  ad_text       text,                             -- reklam metni
  story_text    text,                             -- hikâye metni
  visual_url    text,                             -- Modül 3: üretilen/seçilen görsel
  visual_type   text not null default 'image' check (visual_type in ('image', 'video', 'model')),
  status        content_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index contents_business_created_idx on contents(business_id, created_at desc);
create index contents_status_idx on contents(business_id, status);

-- ---------------------------------------------------------------
-- 4) calendar_items — Modül 4 (içerik takvimi)
-- Otomatik yayın yok: kullanıcı manuel paylaşır, sistem hatırlatır.
-- ---------------------------------------------------------------
create table calendar_items (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  content_id    uuid not null references contents(id) on delete cascade,
  platform      social_platform,
  scheduled_at  timestamptz not null,
  remind_at     timestamptz,                      -- paylaşım hatırlatması
  done          boolean not null default false,   -- manuel paylaşıldı mı
  created_at    timestamptz not null default now()
);
create index calendar_items_business_date_idx on calendar_items(business_id, scheduled_at);

-- ---------------------------------------------------------------
-- updated_at otomatik güncelleme
-- ---------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_updated_at before update on businesses
  for each row execute function set_updated_at();
create trigger contents_updated_at before update on contents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------
-- Tutarlılık: calendar_items.content_id ve contents.parent_id,
-- aynı işletmeye ait olmak zorunda (RLS'i dolanmayı engeller).
-- ---------------------------------------------------------------
create or replace function check_same_business() returns trigger as $$
declare
  other_business uuid;
begin
  if tg_table_name = 'calendar_items' then
    select business_id into other_business from contents where id = new.content_id;
  elsif tg_table_name = 'contents' and new.parent_id is not null then
    select business_id into other_business from contents where id = new.parent_id;
  else
    return new;
  end if;

  if other_business is distinct from new.business_id then
    raise exception 'İlişkili kayıt farklı bir işletmeye ait';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger calendar_items_same_business before insert or update on calendar_items
  for each row execute function check_same_business();
create trigger contents_same_business before insert or update on contents
  for each row execute function check_same_business();

-- ---------------------------------------------------------------
-- Row Level Security — her kullanıcı yalnızca kendi işletmelerini görür
-- ---------------------------------------------------------------
alter table businesses      enable row level security;
alter table social_accounts enable row level security;
alter table contents        enable row level security;
alter table calendar_items  enable row level security;

create policy "businesses: sahibi tam erişim" on businesses
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- İşletmeye bağlı tablolar için ortak koşul
create policy "social_accounts: işletme sahibi" on social_accounts
  for all
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "contents: işletme sahibi" on contents
  for all
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "calendar_items: işletme sahibi" on calendar_items
  for all
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- ---------------------------------------------------------------
-- Storage notu: 'logos' ve 'visuals' bucket'larını oluşturun ve
-- dosya yollarını '<business_id>/dosya.png' biçiminde tutun;
-- bucket politikaları da aynı sahiplik kuralını kullanmalı.
-- ---------------------------------------------------------------
