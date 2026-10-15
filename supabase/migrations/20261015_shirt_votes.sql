-- Allow shirt design votes. Paste into the Supabase SQL editor before deploying the Edge Function.
do $$
declare c text;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.reunion_records'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%kind%'
  loop
    execute format('alter table public.reunion_records drop constraint %I', c);
  end loop;
end $$;
alter table public.reunion_records add constraint reunion_records_kind_check
  check (kind in ('trip','person','meal','shirt','message','photo','vote'));
