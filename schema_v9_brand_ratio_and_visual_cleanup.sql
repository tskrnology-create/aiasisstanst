-- v8_post_packages.sql sonrasında Supabase SQL Editor'de çalıştırın.
-- Tekrar uygulanabilir. Bu dosya depoya eklenir; canlı Supabase'e bu görevde uygulanmaz.

alter table public.businesses
  add column if not exists primary_share smallint not null default 70;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_primary_share_check'
  ) then
    alter table public.businesses
      add constraint businesses_primary_share_check check (primary_share between 0 and 100);
  end if;
end;
$$;

-- v6 atomik profil RPC'sini yeni alanı da atomik kaydedecek şekilde genişlet.
create or replace function public.save_business_with_accounts(
  p_business_id uuid,
  p_profile jsonb,
  p_accounts jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid := auth.uid();
  v_business_id uuid;
  v_name text;
  v_industry text;
  v_products text;
  v_target_audience text;
  v_brand_voice text;
  v_brand_colors text[];
  v_content_language public.content_language;
  v_logo_url text;
  v_primary_share integer;
begin
  if v_owner_id is null then
    raise exception using errcode = '42501', message = 'Oturum doğrulanamadı';
  end if;
  if jsonb_typeof(p_profile) is distinct from 'object' then
    raise exception 'Profil alanları bir JSON nesnesi olmalı';
  end if;
  if jsonb_typeof(p_accounts) is distinct from 'array' then
    raise exception 'Sosyal hesaplar bir JSON dizisi olmalı';
  end if;
  if p_profile ? 'brand_colors'
     and jsonb_typeof(p_profile->'brand_colors') not in ('array', 'null') then
    raise exception 'Marka renkleri bir JSON dizisi olmalı';
  end if;

  v_name := btrim(coalesce(p_profile->>'name', ''));
  v_industry := btrim(coalesce(p_profile->>'industry', ''));
  if v_name = '' or v_industry = '' then
    raise exception 'İşletme adı ve sektör boş olamaz';
  end if;
  v_products := nullif(btrim(coalesce(p_profile->>'products', '')), '');
  v_target_audience := nullif(btrim(coalesce(p_profile->>'target_audience', '')), '');
  v_brand_voice := nullif(btrim(coalesce(p_profile->>'brand_voice', '')), '');
  v_logo_url := p_profile->>'logo_url';
  v_content_language := coalesce(nullif(p_profile->>'content_language', ''), 'tr')::public.content_language;
  v_primary_share := coalesce(nullif(p_profile->>'primary_share', '')::integer, 70);
  if v_primary_share < 0 or v_primary_share > 100 then
    raise exception 'Ana renk oranı 0 ile 100 arasında olmalı';
  end if;

  select coalesce(array_agg(colors.color order by colors.ordinality), array[]::text[])
    into v_brand_colors
    from jsonb_array_elements_text(
      coalesce(nullif(p_profile->'brand_colors', 'null'::jsonb), '[]'::jsonb)
    ) with ordinality as colors(color, ordinality);
  if cardinality(v_brand_colors) <> 2
     or v_brand_colors[1] !~ '^#[0-9A-Fa-f]{6}$'
     or v_brand_colors[2] !~ '^#[0-9A-Fa-f]{6}$'
     or upper(v_brand_colors[1]) = upper(v_brand_colors[2]) then
    raise exception 'Birbirinden farklı iki geçerli marka rengi gerekli';
  end if;

  if p_business_id is null then
    insert into public.businesses (
      owner_id, name, industry, products, target_audience, brand_voice,
      brand_colors, content_language, logo_url, primary_share
    ) values (
      v_owner_id, v_name, v_industry, v_products, v_target_audience, v_brand_voice,
      v_brand_colors, v_content_language, v_logo_url, v_primary_share
    ) returning id into v_business_id;
  else
    update public.businesses
       set name = v_name,
           industry = v_industry,
           products = v_products,
           target_audience = v_target_audience,
           brand_voice = v_brand_voice,
           brand_colors = v_brand_colors,
           content_language = v_content_language,
           logo_url = v_logo_url,
           primary_share = v_primary_share
     where id = p_business_id and owner_id = v_owner_id
    returning id into v_business_id;
    if v_business_id is null then
      raise exception using errcode = '42501', message = 'Bu markaya erişim yetkiniz yok';
    end if;
  end if;

  perform public.sync_social_accounts(v_business_id, p_accounts);
  return v_business_id;
end;
$$;
revoke all on function public.save_business_with_accounts(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_business_with_accounts(uuid, jsonb, jsonb) to authenticated;

-- Başarılı görsel değişiminden sonra önceki özel dosyayı silmek için tekrar denenebilir kuyruk.
create table if not exists public.visual_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  unique (business_id, storage_path)
);
create index if not exists visual_cleanup_queue_business_created_idx
  on public.visual_cleanup_queue (business_id, created_at);
alter table public.visual_cleanup_queue enable row level security;
drop policy if exists "visual_cleanup_queue: business owner" on public.visual_cleanup_queue;
create policy "visual_cleanup_queue: business owner" on public.visual_cleanup_queue
  for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
grant select, insert, update, delete on public.visual_cleanup_queue to authenticated;

-- İçerik görselini ve eski dosya cleanup kaydını tek DB transaction'ında değiştir.
create or replace function public.replace_content_visual(
  p_content_id uuid,
  p_business_id uuid,
  p_new_storage_path text,
  p_prompt text,
  p_tone text,
  p_post_text text,
  p_caption text,
  p_hashtags text[],
  p_ad_text text,
  p_story_text text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_content public.contents%rowtype;
  v_old_storage_path text;
begin
  if p_new_storage_path !~ ('^' || p_business_id::text || '/[0-9a-fA-F-]{36}\.png$') then
    raise exception 'Geçersiz yeni medya yolu';
  end if;

  select visual_url into v_old_storage_path
    from public.contents
   where id = p_content_id and business_id = p_business_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'İçerik bulunamadı veya bu markaya ait değil';
  end if;

  update public.contents
     set visual_url = p_new_storage_path,
         visual_type = 'image',
         prompt = coalesce(nullif(btrim(p_prompt), ''), prompt),
         tone = p_tone,
         post_text = p_post_text,
         caption = p_caption,
         hashtags = coalesce(p_hashtags, '{}'::text[]),
         ad_text = p_ad_text,
         story_text = p_story_text
   where id = p_content_id and business_id = p_business_id
  returning * into v_content;
  if not found then
    raise exception using errcode = 'P0002', message = 'İçerik bulunamadı veya bu markaya ait değil';
  end if;

  if v_old_storage_path is distinct from p_new_storage_path
     and v_old_storage_path is not null
     and v_old_storage_path ~ ('^' || p_business_id::text || '/[0-9a-fA-F-]{36}\.png$') then
    insert into public.visual_cleanup_queue (business_id, storage_path)
    values (p_business_id, v_old_storage_path)
    on conflict (business_id, storage_path) do nothing;
  end if;
  return to_jsonb(v_content);
end;
$$;
revoke all on function public.replace_content_visual(uuid, uuid, text, text, text, text, text, text[], text, text) from public, anon;
grant execute on function public.replace_content_visual(uuid, uuid, text, text, text, text, text, text[], text, text) to authenticated;
