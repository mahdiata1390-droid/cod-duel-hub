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
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_cod_nickname_idx on public.profiles using gin (cod_nickname gin_trgm_ops);
create index if not exists profiles_cod_uid_idx on public.profiles (cod_uid);
create extension if not exists pg_trgm;

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
returns trigger as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendships (user_a, user_b)
    values (least(new.sender_id, new.receiver_id), greatest(new.sender_id, new.receiver_id))
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

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

-- Enable Realtime on messages + notifications (safe to re-run).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

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
returns trigger as $$
declare
  duel_row public.duels%rowtype;
  other_confirmation public.duel_confirmations%rowtype;
  final_challenger_score integer;
  final_opponent_score integer;
begin
  select * into duel_row from public.duels where id = new.duel_id;

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
$$ language plpgsql security definer;

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
returns trigger as $$
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
$$ language plpgsql security definer;

drop trigger if exists on_friend_request_notify on public.friend_requests;
create trigger on_friend_request_notify
  after insert or update on public.friend_requests
  for each row execute function public.notify_friend_request();

create or replace function public.notify_duel_event()
returns trigger as $$
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
$$ language plpgsql security definer;

drop trigger if exists on_duel_notify on public.duels;
create trigger on_duel_notify
  after insert or update on public.duels
  for each row execute function public.notify_duel_event();

create or replace function public.notify_duel_confirmation()
returns trigger as $$
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
$$ language plpgsql security definer;

drop trigger if exists on_duel_confirmation_notify on public.duel_confirmations;
create trigger on_duel_confirmation_notify
  after insert on public.duel_confirmations
  for each row execute function public.notify_duel_confirmation();

create or replace function public.notify_new_message()
returns trigger as $$
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
$$ language plpgsql security definer;

drop trigger if exists on_new_message_notify on public.messages;
create trigger on_new_message_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();
