-- v5 sonrasında çalıştırın. Profil ve sosyal hesaplar tek PostgreSQL işlemi olarak kaydedilir.
-- Bu migration, mevcut işletme verisini değiştirmez; tekrar çalıştırılabilir.

create or replace function public.prevent_content_business_reassignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception using
      errcode = '23514',
      message = 'İçeriğin marka kimliği değiştirilemez; yeni marka için içeriği yeniden oluşturun.';
  end if;
  return new;
end;
$$;

drop trigger if exists contents_business_id_immutable on public.contents;
create trigger contents_business_id_immutable
  before update of business_id on public.contents
  for each row execute function public.prevent_content_business_reassignment();

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
      brand_colors, content_language, logo_url
    ) values (
      v_owner_id, v_name, v_industry, v_products, v_target_audience, v_brand_voice,
      v_brand_colors, v_content_language, v_logo_url
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
           logo_url = v_logo_url
     where id = p_business_id
       and owner_id = v_owner_id
    returning id into v_business_id;
    if v_business_id is null then
      raise exception using errcode = '42501', message = 'Bu markaya erişim yetkiniz yok';
    end if;
  end if;

  -- RPC başarısız olursa profil yazımı da bu transaction ile geri alınır.
  perform public.sync_social_accounts(v_business_id, p_accounts);
  return v_business_id;
end;
$$;

revoke all on function public.save_business_with_accounts(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_business_with_accounts(uuid, jsonb, jsonb) to authenticated;

comment on function public.save_business_with_accounts(uuid, jsonb, jsonb) is
  'İşletme profili ve sosyal hesapları tek transaction içinde kaydeder.';
