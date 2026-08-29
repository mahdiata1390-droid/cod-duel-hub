/**
 * Types mirroring the Supabase schema (see /supabase/schema.sql).
 * These are hand-written for now; once the project is linked you can
 * replace this file with output from:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type DuelStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled"
  | "disputed";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export type NotificationType =
  | "friend_request"
  | "friend_request_accepted"
  | "friend_request_rejected"
  | "duel_request"
  | "duel_accepted"
  | "duel_rejected"
  | "duel_result_confirmation"
  | "new_message";

export interface Profile {
  id: string; // references auth.users.id
  username: string;
  cod_nickname: string;
  cod_uid: string;
  avatar_url: string | null;
  bio: string | null;
  rank: string | null;
  country: string | null;
  wins: number;
  losses: number;
  draws: number;
  total_duels: number;
  xp: number;
  show_duel_history: boolean;
  last_seen_at: string; // ISO timestamp — presence on THIS site only
  created_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: DuelStatus;
  challenger_score: number | null;
  opponent_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface DuelConfirmation {
  id: string;
  duel_id: string;
  user_id: string;
  confirmed: boolean;
  disputed: boolean;
  submitted_challenger_score: number | null;
  submitted_opponent_score: number | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/** Shape used by the Supabase JS client's `Database` generic. */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      friend_requests: {
        Row: FriendRequest;
        Insert: Partial<FriendRequest>;
        Update: Partial<FriendRequest>;
        Relationships: [];
      };
      friendships: {
        Row: Friendship;
        Insert: Partial<Friendship>;
        Update: Partial<Friendship>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation>;
        Update: Partial<Conversation>;
        Relationships: [];
      };
      conversation_members: {
        Row: ConversationMember;
        Insert: Partial<ConversationMember>;
        Update: Partial<ConversationMember>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message>;
        Update: Partial<Message>;
        Relationships: [];
      };
      duels: {
        Row: Duel;
        Insert: Partial<Duel>;
        Update: Partial<Duel>;
        Relationships: [];
      };
      duel_confirmations: {
        Row: DuelConfirmation;
        Insert: Partial<DuelConfirmation>;
        Update: Partial<DuelConfirmation>;
        Relationships: [];
      };
      notifications: {
        Row: AppNotification;
        Insert: Partial<AppNotification>;
        Update: Partial<AppNotification>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      start_direct_conversation: {
        Args: { other_user_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
