-- COD Duel Hub: additive Owner/Admin migration
-- Paste this entire file into Supabase SQL Editor on an existing database.
-- It preserves users, profiles, duels, messages, friendships, and notifications.

create extension if not exists "uuid-ossp";

-- Account state is kept on profiles, while privileges live in a separate table.
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists suspended_until timestamptz;
update public.profiles set account_status = 'active' where account_status is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_account_status_check
      check (account_status in ('active', 'suspended', 'banned'));
  end if;
end $$;

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id uuid references auth.users (id) on delete set null,
  action_type text not null check (action_type in (
    'user_suspended', 'user_unsuspended', 'user_banned', 'user_unbanned',
    'duel_result_changed', 'duel_cancelled'
  )),
  target_user_id uuid references auth.users (id) on delete set null,
  target_duel_id uuid references public.duels (id) on delete set null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

-- These helpers only answer for the current caller, preventing role/status probing.
create or replace function public.is_account_active(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = target_user_id
        and account_status = 'active'
        and (suspended_until is null or suspended_until > now())
    );
$$;

create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    and public.is_account_active(target_user_id)
    and exists (
      select 1 from public.admin_roles
      where user_id = target_user_id and role in ('owner', 'admin')
    );
$$;

revoke all on function public.is_account_active(uuid) from public;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_account_active(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.recalculate_duel_stats(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
  set wins = (select count(*)::integer from public.duels d
              where d.status = 'completed' and d.challenger_id = target_user_id
                and d.challenger_score > d.opponent_score)
          + (select count(*)::integer from public.duels d
             where d.status = 'completed' and d.opponent_id = target_user_id
               and d.opponent_score > d.challenger_score),
      losses = (select count(*)::integer from public.duels d
                where d.status = 'completed' and d.challenger_id = target_user_id
                  and d.challenger_score < d.opponent_score)
             + (select count(*)::integer from public.duels d
                where d.status = 'completed' and d.opponent_id = target_user_id
                  and d.opponent_score < d.challenger_score),
      draws = (select count(*)::integer from public.duels d
               where d.status = 'completed'
                 and (d.challenger_id = target_user_id or d.opponent_id = target_user_id)
                 and d.challenger_score = d.opponent_score),
      total_duels = (select count(*)::integer from public.duels d
                     where d.status = 'completed'
                       and (d.challenger_id = target_user_id or d.opponent_id = target_user_id)),
      xp = (select coalesce(sum(case
                 when d.challenger_id = target_user_id and d.challenger_score > d.opponent_score then 25
                 when d.opponent_id = target_user_id and d.opponent_score > d.challenger_score then 25
                 else 10 end), 0)::integer
            from public.duels d
            where d.status = 'completed'
              and (d.challenger_id = target_user_id or d.opponent_id = target_user_id)
  where p.id = target_user_id;
end;
$$;

create or replace function public.admin_list_users()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.profiles p
  where public.is_admin(auth.uid())
  order by p.created_at desc;
$$;

create or replace function public.admin_list_duels()
returns table (
  id uuid,
  challenger_id uuid,
  opponent_id uuid,
  status text,
  challenger_score integer,
  opponent_score integer,
  created_at timestamptz,
  updated_at timestamptz,
  challenger_username text,
  opponent_username text
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.challenger_id, d.opponent_id, d.status,
    d.challenger_score, d.opponent_score, d.created_at, d.updated_at,
    cp.username, op.username
  from public.duels d
  join public.profiles cp on cp.id = d.challenger_id
  join public.profiles op on op.id = d.opponent_id
  where public.is_admin(auth.uid())
  order by d.created_at desc;
$$;

create or replace function public.admin_set_user_status(
  target_user_id uuid,
  new_status text,
  new_suspended_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_value jsonb;
  action_name text;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin access required'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot change your own account status'; end if;
  if new_status not in ('active', 'suspended', 'banned') then raise exception 'invalid account status'; end if;

  select jsonb_build_object('account_status', account_status, 'suspended_until', suspended_until)
  into previous_value from public.profiles where id = target_user_id for update;
  if previous_value is null then raise exception 'user not found'; end if;

  update public.profiles
  set account_status = new_status,
      suspended_until = case when new_status = 'suspended' then new_suspended_until else null end
  where id = target_user_id;

  action_name := case
    when new_status = 'banned' then 'user_banned'
    when new_status = 'suspended' then 'user_suspended'
    when (previous_value ->> 'account_status') = 'banned' then 'user_unbanned'
    else 'user_unsuspended'
  end;
  insert into public.admin_audit_logs (admin_user_id, action_type, target_user_id, previous_value, new_value)
  values (auth.uid(), action_name, target_user_id, previous_value,
    jsonb_build_object('account_status', new_status, 'suspended_until',
      case when new_status = 'suspended' then new_suspended_until else null end));
end;
$$;

create or replace function public.admin_update_duel_result(
  target_duel_id uuid,
  new_challenger_score integer,
  new_opponent_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  duel_row public.duels%rowtype;
  previous_value jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin access required'; end if;
  if new_challenger_score is null or new_opponent_score is null
     or new_challenger_score < 0 or new_opponent_score < 0 then
    raise exception 'scores must be non-negative';
  end if;

  select * into duel_row from public.duels where id = target_duel_id for update;
  if duel_row.id is null then raise exception 'duel not found'; end if;
  previous_value := jsonb_build_object('status', duel_row.status,
    'challenger_score', duel_row.challenger_score, 'opponent_score', duel_row.opponent_score);

  update public.duels set status = 'completed', challenger_score = new_challenger_score,
    opponent_score = new_opponent_score, updated_at = now() where id = target_duel_id;
  perform public.recalculate_duel_stats(duel_row.challenger_id);
  perform public.recalculate_duel_stats(duel_row.opponent_id);
  insert into public.admin_audit_logs (admin_user_id, action_type, target_duel_id, previous_value, new_value)
  values (auth.uid(), 'duel_result_changed', target_duel_id, previous_value,
    jsonb_build_object('status', 'completed', 'challenger_score', new_challenger_score,
      'opponent_score', new_opponent_score));
end;
$$;

create or replace function public.admin_cancel_duel(target_duel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  duel_row public.duels%rowtype;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin access required'; end if;
  select * into duel_row from public.duels where id = target_duel_id for update;
  if duel_row.id is null then raise exception 'duel not found'; end if;

  update public.duels set status = 'cancelled', updated_at = now() where id = target_duel_id;
  perform public.recalculate_duel_stats(duel_row.challenger_id);
  perform public.recalculate_duel_stats(duel_row.opponent_id);
  insert into public.admin_audit_logs (admin_user_id, action_type, target_duel_id, previous_value, new_value)
  values (auth.uid(), 'duel_cancelled', target_duel_id,
    jsonb_build_object('status', duel_row.status, 'challenger_score', duel_row.challenger_score,
      'opponent_score', duel_row.opponent_score), jsonb_build_object('status', 'cancelled'));
end;
$$;

revoke all on function public.recalculate_duel_stats(uuid) from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_list_duels() from public;
revoke all on function public.admin_set_user_status(uuid, text, timestamptz) from public;
revoke all on function public.admin_update_duel_result(uuid, integer, integer) from public;
revoke all on function public.admin_cancel_duel(uuid) from public;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_duels() to authenticated;
grant execute on function public.admin_set_user_status(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_update_duel_result(uuid, integer, integer) to authenticated;
grant execute on function public.admin_cancel_duel(uuid) to authenticated;

-- RLS is additive here: restrictive policies combine with existing policies,
-- so existing participant/self-access rules remain intact.
alter table public.admin_roles enable row level security;
alter table public.admin_audit_logs enable row level security;

-- No admin_roles policies are intentional: clients cannot read or write roles.
drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
create policy "Admins can view audit logs"
  on public.admin_audit_logs for select
  using (public.is_admin(auth.uid()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'friend_requests', 'friendships', 'conversations',
    'conversation_members', 'messages', 'duels', 'duel_confirmations', 'notifications'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', 'Active accounts only', table_name);
    execute format(
      'create policy %I on public.%I as restrictive for all using (public.is_account_active(auth.uid())) with check (public.is_account_active(auth.uid()))',
      'Active accounts only', table_name
    );
  end loop;
end $$;

-- Preserve the existing result-confirmation trigger and create it only if an
-- older database has the function but not the trigger.
do $$
begin
  if to_regprocedure('public.handle_duel_confirmation()') is not null
     and not exists (
       select 1 from pg_trigger
       where tgname = 'on_duel_confirmation'
         and tgrelid = 'public.duel_confirmations'::regclass
         and not tgisinternal
     ) then
    create trigger on_duel_confirmation
      after insert or update on public.duel_confirmations
      for each row execute function public.handle_duel_confirmation();
  end if;
end $$;

-- IMPORTANT: seed the owner separately, using a trusted auth.users UUID:
-- insert into public.admin_roles (user_id, role)
-- values ('OWNER_AUTH_USER_ID', 'owner');
