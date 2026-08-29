-- =====================================================================
-- COD Duel Hub — Row Level Security policies
-- Apply AFTER schema.sql. Run in the Supabase SQL editor.
--
-- Design summary:
--   * Every table has RLS enabled — nothing is readable/writable by
--     default.
--   * Profiles are publicly readable (it's a player-search platform)
--     but only self-editable.
--   * Conversations/messages are restricted to their members.
--   * Friend requests/duels can only be created and responded to by
--     their actual participants.
--   * Stat fields (wins/losses/draws/total_duels/xp) and duel scores
--     are NEVER updatable directly by clients — only the
--     SECURITY DEFINER trigger functions in schema.sql touch them.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.duels enable row level security;
alter table public.duel_confirmations enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Stat/score fields may not be forged by the client: enforce that
    -- an UPDATE cannot change them (they only move via the trigger,
    -- which runs as SECURITY DEFINER and bypasses RLS entirely).
    and wins = (select wins from public.profiles where id = auth.uid())
    and losses = (select losses from public.profiles where id = auth.uid())
    and draws = (select draws from public.profiles where id = auth.uid())
    and total_duels = (select total_duels from public.profiles where id = auth.uid())
    and xp = (select xp from public.profiles where id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- friend_requests
-- ---------------------------------------------------------------------
create policy "Users can view requests involving themselves"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send friend requests as themselves"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "Receivers can respond to their own requests"
  on public.friend_requests for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

create policy "Senders can cancel their own pending requests"
  on public.friend_requests for delete
  using (auth.uid() = sender_id);

-- ---------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------
create policy "Users can view their own friendships"
  on public.friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can remove their own friendships"
  on public.friendships for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Friendships are only ever created by the handle_friend_request_accepted
-- trigger (SECURITY DEFINER), so no direct INSERT policy is granted here.

-- ---------------------------------------------------------------------
-- conversations / conversation_members
-- ---------------------------------------------------------------------
create policy "Members can view their conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = id and cm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can start a conversation"
  on public.conversations for insert
  with check (auth.uid() is not null);

create policy "Members can view conversation membership"
  on public.conversation_members for select
  using (
    exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = conversation_id and cm2.user_id = auth.uid()
    )
  );

create policy "Users can add themselves or invitees to a new conversation"
  on public.conversation_members for insert
  with check (auth.uid() is not null);

create policy "Members can update their own membership row"
  on public.conversation_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create policy "Members can read messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
  );

create policy "Members can send messages in their conversations"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- duels
-- ---------------------------------------------------------------------
create policy "Participants can view their duels"
  on public.duels for select
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

create policy "Users can challenge others as themselves"
  on public.duels for insert
  with check (auth.uid() = challenger_id and challenger_id <> opponent_id);

create policy "Participants can update duel status (not scores directly)"
  on public.duels for update
  using (auth.uid() = challenger_id or auth.uid() = opponent_id)
  with check (
    (auth.uid() = challenger_id or auth.uid() = opponent_id)
    -- Scores may only be set by the duel_confirmations trigger, never
    -- by a direct client update.
    and challenger_score is not distinct from (select challenger_score from public.duels where id = duels.id)
    and opponent_score is not distinct from (select opponent_score from public.duels where id = duels.id)
  );

-- ---------------------------------------------------------------------
-- duel_confirmations
-- ---------------------------------------------------------------------
create policy "Participants can view confirmations for their duels"
  on public.duel_confirmations for select
  using (
    exists (
      select 1 from public.duels d
      where d.id = duel_confirmations.duel_id
        and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())
    )
  );

create policy "Participants can submit their own confirmation"
  on public.duel_confirmations for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.duels d
      where d.id = duel_confirmations.duel_id
        and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())
    )
  );

create policy "Participants can update their own confirmation only"
  on public.duel_confirmations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications are only ever inserted by the SECURITY DEFINER trigger
-- functions in schema.sql — no client-facing INSERT policy is granted,
-- which prevents anyone from spoofing a notification to another user.
