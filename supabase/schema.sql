-- Shared-family application: browser roles have no direct table or storage access.
-- Only the password-authenticated Edge Function may access these records.
create table public.reunion_access (id integer primary key check(id=1), salt text not null, password_hash text not null);
create table public.reunion_records (
  id text primary key,
  year integer not null check(year between 2000 and 2100),
  kind text not null check(kind in ('trip','person','meal','shirt','message','photo','vote')),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create index reunion_records_year_kind_idx on public.reunion_records(year,kind);
create table public.reunion_attempts (key text primary key, count integer not null, expires_at timestamptz not null);
alter table public.reunion_access enable row level security;
alter table public.reunion_records enable row level security;
alter table public.reunion_attempts enable row level security;
revoke all on public.reunion_access,public.reunion_records,public.reunion_attempts from anon,authenticated;
grant all on public.reunion_access,public.reunion_records,public.reunion_attempts to service_role;
create function public.reunion_throttle(attempt_key text) returns integer language plpgsql security invoker set search_path='' as $$
declare attempts integer;
begin
 delete from public.reunion_attempts where expires_at < now();
 insert into public.reunion_attempts(key,count,expires_at) values(attempt_key,1,now()+interval '15 minutes')
 on conflict(key) do update set count=public.reunion_attempts.count+1 returning count into attempts;
 return attempts;
end; $$;
revoke all on function public.reunion_throttle(text) from public,anon,authenticated;
grant execute on function public.reunion_throttle(text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('reunion-photos','reunion-photos',false,10485760,array['image/jpeg','image/png','image/webp']);
