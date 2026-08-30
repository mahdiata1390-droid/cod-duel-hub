-- =====================================================================
-- COD Duel Hub — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Pairs with policies.sql, which must be applied AFTER this file.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- profiles
-- One row per auth.users row. Created client-side on sign-up (see
-- AuthContext.tsx) and guarded by RLS so a user may only insert/update
-- their own row.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  cod_nickname text not null,
  cod_uid text not null,
  avatar_url text,
  bio text,
  rank text,
  country text,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  total_duels integer not null default 0,
  xp integer not null default 0,
  show_duel_history boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'banned')),
  suspended_until timestamptz
);

alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists suspended_until timestamptz;
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

-- Roles are deliberately separate from profiles so clients cannot promote
-- themselves by updating their public profile row. Seed the owner manually.
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create extension if not exists pg_trgm;
create index if not exists profiles_username_idx on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_cod_nickname_idx on public.profiles using gin (cod_nickname gin_trgm_ops);
create index if not exists profiles_cod_uid_idx on public.profiles (cod_uid);

-- Auto-create a profile whenever a new auth user signs up. The client
-- passes username / cod_nickname / cod_uid in raw_user_meta_data, and
-- the trigger copies them into the matching public.profiles row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    cod_nickname,
    cod_uid,
    avatar_url,
    bio,
    rank,
    country,
    last_seen_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'cod_nickname', ''),
    coalesce(new.raw_user_meta_data ->> 'cod_uid', ''),
    null,
    null,
    null,
    null,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_account_active(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
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
  select public.is_account_active(target_user_id)
    and exists (
      select 1 from public.admin_roles
      where user_id = target_user_id and role in ('owner', 'admin')
    );
$$;

revoke all on function public.is_account_active(uuid) from public;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_account_active(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- friend_requests / friendships
-- ---------------------------------------------------------------------
create table if not exists public.friend_requests (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_request check (sender_id <> receiver_id),
  constraint unique_pending_request unique (sender_id, receiver_id)
);

create table if not exists public.friendships (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_friendship check (user_a <> user_b),
  constraint unique_friendship unique (user_a, user_b)
);

-- When a friend request is accepted, materialize a friendship row.
create or replace function public.handle_friend_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendships (user_a, user_b)
    values (least(new.sender_id, new.receiver_id), greatest(new.sender_id, new.receiver_id))
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_friend_request_accepted on public.friend_requests;
create trigger on_friend_request_accepted
  after update on public.friend_requests
  for each row execute function public.handle_friend_request_accepted();

-- ---------------------------------------------------------------------
-- conversations / conversation_members / messages
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  is_group boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.start_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null or other_user_id is null or current_user_id = other_user_id then
    raise exception 'invalid conversation participants';
  end if;

  select c.id
  into existing_conversation_id
  from public.conversations c
  join public.conversation_members cm1 on cm1.conversation_id = c.id and cm1.user_id = current_user_id
  join public.conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id = other_user_id
  where c.is_group = false
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.conversations (is_group)
  values (false)
  returning id into new_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (new_conversation_id, current_user_id), (new_conversation_id, other_user_id);

  return new_conversation_id;
end;
$$;

-- ---------------------------------------------------------------------
-- duels / duel_confirmations
-- ---------------------------------------------------------------------
create table if not exists public.duels (
  id uuid primary key default uuid_generate_v4(),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'disputed')),
  challenger_score integer,
  opponent_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_duel check (challenger_id <> opponent_id)
);

create index if not exists duels_participants_idx on public.duels (challenger_id, opponent_id);

create table if not exists public.duel_confirmations (
  id uuid primary key default uuid_generate_v4(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  confirmed boolean not null default false,
  disputed boolean not null default false,
  submitted_challenger_score integer,
  submitted_opponent_score integer,
  created_at timestamptz not null default now(),
  constraint unique_confirmation_per_user unique (duel_id, user_id)
);

-- ---------------------------------------------------------------------
-- Trigger: once BOTH players confirm matching scores, mark the duel
-- completed and update stats. This is the ONLY place stats are ever
-- written — never from client code — so results can't be forged by
-- calling `profiles.update` directly (RLS also blocks that, see
-- policies.sql).
-- ---------------------------------------------------------------------
create or replace function public.handle_duel_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  duel_row public.duels%rowtype;
  other_confirmation public.duel_confirmations%rowtype;
  final_challenger_score integer;
  final_opponent_score integer;
begin
  select * into duel_row from public.duels where id = new.duel_id;

  if duel_row.status = 'completed' then
    return new;
  end if;

  if new.disputed then
    update public.duels set status = 'disputed', updated_at = now() where id = new.duel_id;
    return new;
  end if;

  select * into other_confirmation
  from public.duel_confirmations
  where duel_id = new.duel_id and user_id <> new.user_id;

  if other_confirmation.id is null or not other_confirmation.confirmed then
    return new; -- waiting on the other player
  end if;

  if new.submitted_challenger_score is distinct from other_confirmation.submitted_challenger_score
     or new.submitted_opponent_score is distinct from other_confirmation.submitted_opponent_score then
    update public.duels set status = 'disputed', updated_at = now() where id = new.duel_id;
    return new;
  end if;

  final_challenger_score := new.submitted_challenger_score;
  final_opponent_score := new.submitted_opponent_score;

  update public.duels
    set status = 'completed',
        challenger_score = final_challenger_score,
        opponent_score = final_opponent_score,
        updated_at = now()
    where id = new.duel_id;

  -- Update challenger stats
  update public.profiles set
    wins = wins + (case when final_challenger_score > final_opponent_score then 1 else 0 end),
    losses = losses + (case when final_challenger_score < final_opponent_score then 1 else 0 end),
    draws = draws + (case when final_challenger_score = final_opponent_score then 1 else 0 end),
    total_duels = total_duels + 1,
    xp = xp + (case when final_challenger_score > final_opponent_score then 25 else 10 end)
  where id = duel_row.challenger_id;

  -- Update opponent stats
  update public.profiles set
    wins = wins + (case when final_opponent_score > final_challenger_score then 1 else 0 end),
    losses = losses + (case when final_opponent_score < final_challenger_score then 1 else 0 end),
    draws = draws + (case when final_opponent_score = final_challenger_score then 1 else 0 end),
    total_duels = total_duels + 1,
    xp = xp + (case when final_opponent_score > final_challenger_score then 25 else 10 end)
  where id = duel_row.opponent_id;

  return new;
end;
$$;

drop trigger if exists on_duel_confirmation on public.duel_confirmations;
create trigger on_duel_confirmation
  after insert or update on public.duel_confirmations
  for each row execute function public.handle_duel_confirmation();

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'friend_request', 'friend_request_accepted', 'friend_request_rejected',
    'duel_request', 'duel_accepted', 'duel_rejected',
    'duel_result_confirmation', 'new_message'
  )),
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Notification-emitting triggers — keep this logic server-side so the
-- client can never fabricate a notification on someone else's behalf.
-- ---------------------------------------------------------------------
create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, payload)
    values (new.receiver_id, 'friend_request', jsonb_build_object('name',
      (select username from public.profiles where id = new.sender_id), 'request_id', new.id));
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    insert into public.notifications (user_id, type, payload)
    values (
      new.sender_id,
      case when new.status = 'accepted' then 'friend_request_accepted' else 'friend_request_rejected' end,
      jsonb_build_object('name', (select username from public.profiles where id = new.receiver_id))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_friend_request_notify on public.friend_requests;
create trigger on_friend_request_notify
  after insert or update on public.friend_requests
  for each row execute function public.notify_friend_request();

create or replace function public.notify_duel_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, payload)
    values (new.opponent_id, 'duel_request', jsonb_build_object('name',
      (select username from public.profiles where id = new.challenger_id), 'duel_id', new.id));
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    if new.status = 'accepted' then
      insert into public.notifications (user_id, type, payload)
      values (new.challenger_id, 'duel_accepted', jsonb_build_object('name',
        (select username from public.profiles where id = new.opponent_id)));
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, payload)
      values (new.challenger_id, 'duel_rejected', jsonb_build_object('name',
        (select username from public.profiles where id = new.opponent_id)));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_duel_notify on public.duels;
create trigger on_duel_notify
  after insert or update on public.duels
  for each row execute function public.notify_duel_event();

create or replace function public.notify_duel_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  duel_row public.duels%rowtype;
  other_user uuid;
begin
  select * into duel_row from public.duels where id = new.duel_id;
  other_user := case when new.user_id = duel_row.challenger_id then duel_row.opponent_id else duel_row.challenger_id end;

  insert into public.notifications (user_id, type, payload)
  values (other_user, 'duel_result_confirmation', jsonb_build_object('name',
    (select username from public.profiles where id = new.user_id)));
  return new;
end;
$$;

drop trigger if exists on_duel_confirmation_notify on public.duel_confirmations;
create trigger on_duel_confirmation_notify
  after insert on public.duel_confirmations
  for each row execute function public.notify_duel_confirmation();

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
begin
  for member in
    select user_id from public.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    insert into public.notifications (user_id, type, payload)
    values (member.user_id, 'new_message', jsonb_build_object('name',
      (select username from public.profiles where id = new.sender_id)));
  end loop;
  return new;
end;
$$;

drop trigger if exists on_new_message_notify on public.messages;
create trigger on_new_message_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- Enable Realtime on messages + notifications in a re-runnable way.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Admin management
-- All admin writes are performed through these SECURITY DEFINER functions.
-- The owner/admin role must be seeded out-of-band by a trusted operator.
-- ---------------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id uuid not null references auth.users (id) on delete restrict,
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

create or replace function public.admin_list_users()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
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
               where d.status = 'completed' and (d.challenger_id = target_user_id or d.opponent_id = target_user_id)
                 and d.challenger_score = d.opponent_score),
      total_duels = (select count(*)::integer from public.duels d
                     where d.status = 'completed' and (d.challenger_id = target_user_id or d.opponent_id = target_user_id)),
      xp = (select coalesce(sum(case
                 when d.challenger_id = target_user_id and d.challenger_score > d.opponent_score then 25
                 when d.opponent_id = target_user_id and d.opponent_score > d.challenger_score then 25
                 else 10 end), 0)::integer
            from public.duels d
            where d.status = 'completed' and (d.challenger_id = target_user_id or d.opponent_id = target_user_id))
  where p.id = target_user_id;
end;
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

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_list_duels() from public;
revoke all on function public.recalculate_duel_stats(uuid) from public;
revoke all on function public.admin_set_user_status(uuid, text, timestamptz) from public;
revoke all on function public.admin_update_duel_result(uuid, integer, integer) from public;
revoke all on function public.admin_cancel_duel(uuid) from public;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_duels() to authenticated;
grant execute on function public.admin_set_user_status(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_update_duel_result(uuid, integer, integer) to authenticated;
grant execute on function public.admin_cancel_duel(uuid) to authenticated;
