-- v9 sonrasında Supabase SQL Editor'de çalıştırın. Tekrar uygulanabilir.
-- Paylaşılan gönderinin sonuçları (kullanıcı elle girer). Mevcut calendar_items RLS politikaları geçerlidir.
alter table public.calendar_items
  add column if not exists result_likes integer,
  add column if not exists result_comments integer,
  add column if not exists result_saves integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'calendar_items_results_check'
                 and conrelid = 'public.calendar_items'::regclass) then
    alter table public.calendar_items
      add constraint calendar_items_results_check check (
        (result_likes is null or result_likes between 0 and 100000000) and
        (result_comments is null or result_comments between 0 and 100000000) and
        (result_saves is null or result_saves between 0 and 100000000));
  end if;
end;
$$;
