import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { FriendRequest, Friendship, Profile } from "@/types/database";

export interface FriendRow extends Friendship {
  friendProfile: Profile;
}

export interface FriendRequestRow extends FriendRequest {
  senderProfile: Profile;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setIncomingRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: friendships }, { data: requests }] = await Promise.all([
      supabase
        .from("friendships")
        .select("*, user_a_profile:profiles!friendships_user_a_fkey(*), user_b_profile:profiles!friendships_user_b_fkey(*)")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      supabase
        .from("friend_requests")
        .select("*, senderProfile:profiles!friend_requests_sender_id_fkey(*)")
        .eq("receiver_id", user.id)
        .eq("status", "pending"),
    ]);

    const normalizedFriends: FriendRow[] = ((friendships as any[]) ?? []).map((f) => ({
      ...f,
      friendProfile: f.user_a === user.id ? f.user_b_profile : f.user_a_profile,
    }));

    setFriends(normalizedFriends);
    setIncomingRequests(((requests as any[]) ?? []) as FriendRequestRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return { error: "Not authenticated" };
    if (receiverId === user.id) return { error: "cannotAddSelf" };
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_id: receiverId, status: "pending" });
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: accept ? "accepted" : "rejected", responded_at: new Date().toISOString() })
      .eq("id", requestId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  return {
    friends,
    incomingRequests,
    loading,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    refetch: load,
  };
}
