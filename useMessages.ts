import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation, Message, Profile } from "@/types/database";

export interface ConversationRow extends Conversation {
  otherProfile: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
    if (conversationIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: members } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id, profile:profiles(*)")
      .in("conversation_id", conversationIds)
      .neq("user_id", user.id);

    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    const rows: ConversationRow[] = conversationIds.map((id) => {
      const otherMember = (members as any[] | null)?.find((m) => m.conversation_id === id);
      const conversationMessages = (messages as Message[] | null)?.filter(
        (m) => m.conversation_id === id
      );
      const lastReadAt = memberships?.find((m) => m.conversation_id === id)?.last_read_at;
      const unreadCount = (conversationMessages ?? []).filter(
        (m) =>
          m.sender_id !== user.id &&
          (!lastReadAt || new Date(m.created_at) > new Date(lastReadAt))
      ).length;

      return {
        id,
        is_group: false,
        created_at: conversationMessages?.[conversationMessages.length - 1]?.created_at ?? "",
        otherProfile: otherMember?.profile,
        lastMessage: conversationMessages?.[0] ?? null,
        unreadCount,
      };
    });

    setConversations(rows.sort((a, b) => (b.lastMessage?.created_at ?? "").localeCompare(a.lastMessage?.created_at ?? "")));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const startConversation = async (otherUserId: string) => {
    if (!user) return { error: "Not authenticated", conversationId: null };

    // Atomic, server-side: creates the conversation + both membership
    // rows in one transaction (a client-side insert-then-insert can't
    // satisfy RLS in between the two steps), and returns the existing
    // conversation id instead of a duplicate if one already exists.
    const { data: conversationId, error } = await supabase.rpc("start_direct_conversation", {
      other_user_id: otherUserId,
    });

    if (error) return { error: error.message, conversationId: null };
    return { error: null, conversationId: conversationId as string };
  };

  return { conversations, loading, startConversation, refetch: load };
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);

    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      });

    // Supabase Realtime subscription — live message delivery.
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (content: string) => {
    if (!user || !conversationId || !content.trim()) return { error: "invalid" };
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() });
    return { error: error?.message ?? null };
  };

  const markRead = async () => {
    if (!user || !conversationId) return;
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  };

  return { messages, loading, sendMessage, markRead };
}
