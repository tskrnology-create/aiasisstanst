-- v10 sonrasında Supabase SQL Editor'de çalıştırın. Tekrar uygulanabilir.

create table if not exists public.content_pillars (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 2 and 40),
  description text check (description is null or char_length(description) <= 200),
  position    smallint not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists content_pillars_business_idx on public.content_pillars (business_id, position);

create table if not exists public.voice_samples (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 20 and 1500),
  created_at  timestamptz not null default now()
);
create index if not exists voice_samples_business_idx on public.voice_samples (business_id, created_at);

alter table public.contents add column if not exists ai_assisted boolean not null default true;

-- Marka başına üst sınırlar (RLS'i aşan yazımlara karşı da geçerli).
create or replace function public.enforce_brand_voice_limits() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'content_pillars' and
     (select count(*) from public.content_pillars where business_id = new.business_id) >= 6 then
    raise exception 'En fazla 6 içerik sütunu eklenebilir.' using errcode = 'check_violation';
  elsif tg_table_name = 'voice_samples' and
     (select count(*) from public.voice_samples where business_id = new.business_id) >= 5 then
    raise exception 'En fazla 5 ses örneği eklenebilir.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists content_pillars_limit on public.content_pillars;
create trigger content_pillars_limit before insert on public.content_pillars
  for each row execute function public.enforce_brand_voice_limits();
drop trigger if exists voice_samples_limit on public.voice_samples;
create trigger voice_samples_limit before insert on public.voice_samples
  for each row execute function public.enforce_brand_voice_limits();

alter table public.content_pillars enable row level security;
alter table public.voice_samples enable row level security;

drop policy if exists content_pillars_owner on public.content_pillars;
create policy content_pillars_owner on public.content_pillars for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

drop policy if exists voice_samples_owner on public.voice_samples;
create policy voice_samples_owner on public.voice_samples for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
