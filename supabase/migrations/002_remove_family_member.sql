-- Apply after 001_sukoon.sql. Server-only atomic removal and durable file cleanup.
create or replace function public.check_profile_plan() returns trigger language plpgsql set search_path=public as $$
declare total_count int; type_count int; is_plus boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,0));
 if tg_op='UPDATE' and new.owner_id<>old.owner_id then raise exception 'Owner cannot change'; end if;
 select exists(select 1 from subscriptions where owner_id=new.owner_id and expires_at>now()) into is_plus;
 if not is_plus and (tg_op='INSERT' or new.data->>'type' is distinct from old.data->>'type') then
  select count(*),count(*) filter(where data->>'type'=new.data->>'type') into total_count,type_count from profiles where owner_id=new.owner_id and id<>new.id;
  if total_count>=5 or (new.data->>'type'='Adult' and type_count>=2) or (new.data->>'type'='Child' and type_count>=3) then raise exception 'Free plan profile limit'; end if;
 end if;
 if jsonb_array_length(coalesce(new.data->'parentIds','[]'::jsonb))>2 then raise exception 'Maximum two biological parents'; end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(new.data->'parentIds','[]'::jsonb)) parent where not exists(select 1 from profiles p where p.id::text=parent and p.owner_id=new.owner_id and p.data->>'type'='Adult' and (p.data->>'age')::numeric>(new.data->>'age')::numeric)) then raise exception 'Invalid parent link'; end if;
 if exists(with recursive ancestors(id) as (select value::uuid from jsonb_array_elements_text(coalesce(new.data->'parentIds','[]'::jsonb)) union select value::uuid from ancestors a join profiles p on p.id=a.id cross join lateral jsonb_array_elements_text(coalesce(p.data->'parentIds','[]'::jsonb))) select 1 from ancestors where id=new.id) then raise exception 'Family cycle'; end if;
 return new;
end $$;

create table public.removed_profile_files (
 profile_id uuid primary key, owner_id uuid not null, created_at timestamptz not null default now()
);
alter table public.removed_profile_files enable row level security;
revoke all on public.removed_profile_files from public,anon,authenticated;
grant all on public.removed_profile_files to service_role;
create function public.remove_family_member(p_profile uuid,p_owner uuid) returns void
language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 perform 1 from profiles where id=p_profile and owner_id=p_owner for update;
 if not found then raise exception 'Profile not found'; end if;
 perform 1 from care_sessions where profile_id=p_profile and owner_id=p_owner for update;
 if exists(select 1 from care_sessions where profile_id=p_profile and owner_id=p_owner and processing_until>now()) then raise exception 'Chat in progress'; end if;
 update profiles set data=jsonb_set(data,'{parentIds}',coalesce((select jsonb_agg(value) from jsonb_array_elements(data->'parentIds') where value<>to_jsonb(p_profile::text)),'[]'::jsonb))
 where owner_id=p_owner and id<>p_profile and data->'parentIds' ? p_profile::text;
 insert into removed_profile_files(profile_id,owner_id) values(p_profile,p_owner) on conflict do nothing;
 delete from profiles where id=p_profile and owner_id=p_owner;
end $$;
revoke all on function public.remove_family_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.remove_family_member(uuid,uuid) to service_role;
