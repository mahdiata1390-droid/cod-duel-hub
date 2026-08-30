-- Remove the obsolete duel-history privacy toggle from profiles.
-- This does not delete any user, profile, duel, message, friendship, or notification data.

alter table public.profiles drop column if exists show_duel_history;
