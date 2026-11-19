-- Görsel üretim kullanım kaydı (saatlik limit için). Supabase SQL Editor'de bir kez çalıştırın.

create table if not exists image_generations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists image_generations_business_idx
  on image_generations(business_id, created_at desc);

alter table image_generations enable row level security;

drop policy if exists "image_generations: işletme sahibi" on image_generations;
create policy "image_generations: işletme sahibi" on image_generations
  for all
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));
