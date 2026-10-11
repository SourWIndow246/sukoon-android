-- Apply to a new Supabase project. Never expose a service-role key in the app.
create extension if not exists pgcrypto;
create table public.account_preferences (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 language text not null default 'Hinglish' check(language in ('English','Hinglish')),
 consent_at timestamptz, created_at timestamptz not null default now()
);
create table public.subscriptions (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 expires_at timestamptz, event_timestamp_ms bigint not null default 0,
 created_at timestamptz not null default now()
);
create table public.subscription_events (id text primary key, created_at timestamptz not null default now());
create table public.profiles (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 data jsonb not null, created_at timestamptz not null default now(),
 unique(owner_id,id), check (data->>'id'=id::text),
 check (data->>'type' in ('Adult','Child'))
);
create table public.health_records (
 id uuid primary key, owner_id uuid not null, profile_id uuid not null,
 data jsonb not null, created_at timestamptz not null default now(),
 foreign key(owner_id,profile_id) references public.profiles(owner_id,id) on delete cascade,
 check(data->>'profileId'=profile_id::text), check(data->>'id'=id::text)
);
create table public.care_sessions (
 id uuid primary key, owner_id uuid not null, profile_id uuid not null,
 data jsonb not null, processing_until timestamptz, lock_token uuid,
 created_at timestamptz not null default now(),
 foreign key(owner_id,profile_id) references public.profiles(owner_id,id) on delete cascade,
 check(data->>'profileId'=profile_id::text), check(data->>'id'=id::text)
);
create table public.referral_clicks (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, profile_id uuid not null,
 triage_colour text not null check(triage_colour in ('green','yellow','red')),
 kind text not null check(kind in ('doctor','finance','pharmacy','lab')), created_at timestamptz not null default now(),
 foreign key(owner_id,profile_id) references public.profiles(owner_id,id) on delete cascade
);
create index on public.profiles(owner_id,created_at);
create index on public.health_records(owner_id,profile_id,created_at desc);
create index on public.care_sessions(owner_id,profile_id,created_at desc);
create index on public.referral_clicks(owner_id,created_at);
-- Clients can read only their own records. All structured writes are validated by the API.
alter table public.account_preferences enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.profiles enable row level security;
alter table public.health_records enable row level security;
alter table public.care_sessions enable row level security;
alter table public.referral_clicks enable row level security;
create policy own_preferences on public.account_preferences for select to authenticated using(owner_id=auth.uid());
create policy own_subscription on public.subscriptions for select to authenticated using(owner_id=auth.uid());
create policy own_profiles on public.profiles for select to authenticated using(owner_id=auth.uid());
create policy own_records on public.health_records for select to authenticated using(owner_id=auth.uid());
create policy own_sessions on public.care_sessions for select to authenticated using(owner_id=auth.uid());
create policy own_referrals on public.referral_clicks for select to authenticated using(owner_id=auth.uid());
revoke all on public.account_preferences,public.subscriptions,public.subscription_events,public.profiles,public.health_records,public.care_sessions,public.referral_clicks from anon,authenticated;
grant select on public.account_preferences,public.subscriptions,public.profiles,public.health_records,public.care_sessions,public.referral_clicks to authenticated;

create function public.check_profile_plan() returns trigger language plpgsql set search_path=public as $$
declare total_count int; type_count int; is_plus boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,0));
 if tg_op='UPDATE' and new.owner_id<>old.owner_id then raise exception 'Owner cannot change'; end if;
 select exists(select 1 from subscriptions where owner_id=new.owner_id and expires_at>now()) into is_plus;
 if not is_plus then
  select count(*),count(*) filter(where data->>'type'=new.data->>'type') into total_count,type_count from profiles where owner_id=new.owner_id and id<>new.id;
  if total_count>=5 or (new.data->>'type'='Adult' and type_count>=2) or (new.data->>'type'='Child' and type_count>=3) then raise exception 'Free plan profile limit'; end if;
 end if;
 if jsonb_array_length(coalesce(new.data->'parentIds','[]'::jsonb))>2 then raise exception 'Maximum two biological parents'; end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(new.data->'parentIds','[]'::jsonb)) parent where not exists(select 1 from profiles p where p.id::text=parent and p.owner_id=new.owner_id and p.data->>'type'='Adult' and (p.data->>'age')::numeric>(new.data->>'age')::numeric)) then raise exception 'Invalid parent link'; end if;
 if exists(with recursive ancestors(id) as (select value::uuid from jsonb_array_elements_text(coalesce(new.data->'parentIds','[]'::jsonb)) union select value::uuid from ancestors a join profiles p on p.id=a.id cross join lateral jsonb_array_elements_text(coalesce(p.data->'parentIds','[]'::jsonb))) select 1 from ancestors where id=new.id) then raise exception 'Family cycle'; end if;
 return new;
end $$;
create trigger enforce_plan before insert or update on public.profiles for each row execute function public.check_profile_plan();

create function public.acquire_care_turn(p_session uuid,p_owner uuid) returns uuid language plpgsql set search_path=public as $$
declare token uuid:=gen_random_uuid(); result uuid;
begin
 update care_sessions set processing_until=now()+interval '2 minutes',lock_token=token where id=p_session and owner_id=p_owner and (processing_until is null or processing_until<now()) and data->>'endedAt' is null returning lock_token into result;
 return result;
end $$;
create function public.commit_care_turn(p_session uuid,p_owner uuid,p_token uuid,p_data jsonb) returns boolean language plpgsql set search_path=public as $$
begin
 update care_sessions set data=p_data,processing_until=null,lock_token=null where id=p_session and owner_id=p_owner and lock_token=p_token and processing_until>now() and data->>'endedAt' is null;
 return found;
end $$;
create function public.release_care_turn(p_session uuid,p_owner uuid,p_token uuid) returns void language sql set search_path=public as $$
 update care_sessions set processing_until=null,lock_token=null where id=p_session and owner_id=p_owner and lock_token=p_token;
$$;
create function public.apply_subscription_event(p_event_id text,p_owner uuid,p_timestamp bigint,p_expires timestamptz) returns void language plpgsql set search_path=public as $$
begin
 insert into subscription_events(id) values(p_event_id) on conflict do nothing;
 if not found then return; end if;
 insert into subscriptions(owner_id,expires_at,event_timestamp_ms) values(p_owner,p_expires,p_timestamp)
 on conflict(owner_id) do update set expires_at=excluded.expires_at,event_timestamp_ms=excluded.event_timestamp_ms where subscriptions.event_timestamp_ms<excluded.event_timestamp_ms;
end $$;
revoke all on function public.acquire_care_turn(uuid,uuid),public.commit_care_turn(uuid,uuid,uuid,jsonb),public.release_care_turn(uuid,uuid,uuid),public.apply_subscription_event(text,uuid,bigint,timestamptz) from public,anon,authenticated;
grant execute on function public.acquire_care_turn(uuid,uuid),public.commit_care_turn(uuid,uuid,uuid,jsonb),public.release_care_turn(uuid,uuid,uuid),public.apply_subscription_event(text,uuid,bigint,timestamptz) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('medical-records','medical-records',false,10485760,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
create policy own_files_read on storage.objects for select to authenticated using(bucket_id='medical-records' and (storage.foldername(name))[1]=auth.uid()::text);
create policy own_files_upload on storage.objects for insert to authenticated with check(bucket_id='medical-records' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.profiles where owner_id=auth.uid() and id::text=(storage.foldername(name))[2]));
-- Private object URLs must be signed, never public. No medical files are placed in DB rows.
