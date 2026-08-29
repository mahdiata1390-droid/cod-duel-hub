import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Duel, DuelConfirmation, Profile } from "@/types/database";

export interface DuelRow extends Duel {
  challengerProfile: Profile;
  opponentProfile: Profile;
  confirmations: DuelConfirmation[];
}

export function useDuels() {
  const { user } = useAuth();
  const [duels, setDuels] = useState<DuelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setDuels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("duels")
      .select(
        "*, challengerProfile:profiles!duels_challenger_id_fkey(*), opponentProfile:profiles!duels_opponent_id_fkey(*), confirmations:duel_confirmations(*)"
      )
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    setDuels(((data as any[]) ?? []) as DuelRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const challengePlayer = async (opponentId: string) => {
    if (!user) return { error: "Not authenticated" };
    if (opponentId === user.id) return { error: "cannotChallengeSelf" };
    const { error } = await supabase
      .from("duels")
      .insert({ challenger_id: user.id, opponent_id: opponentId, status: "pending" });
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const respondToDuel = async (duelId: string, accept: boolean) => {
    const { error } = await supabase
      .from("duels")
      .update({ status: accept ? "accepted" : "rejected", updated_at: new Date().toISOString() })
      .eq("id", duelId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const cancelDuel = async (duelId: string) => {
    const { error } = await supabase
      .from("duels")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", duelId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  /**
   * Both players independently submit the score they observed from
   * their own COD Mobile match. Only once both confirmations agree
   * does the duel move to "completed" and stats update — this never
   * happens automatically from an in-game feed.
   */
  const submitResult = async (
    duelId: string,
    challengerScore: number,
    opponentScore: number
  ) => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await supabase.from("duel_confirmations").upsert(
      {
        duel_id: duelId,
        user_id: user.id,
        confirmed: true,
        disputed: false,
        submitted_challenger_score: challengerScore,
        submitted_opponent_score: opponentScore,
      },
      { onConflict: "duel_id,user_id" }
    );
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const disputeResult = async (duelId: string) => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("duels")
      .update({ status: "disputed", updated_at: new Date().toISOString() })
      .eq("id", duelId);
    if (!error) {
      await supabase.from("duel_confirmations").upsert(
        { duel_id: duelId, user_id: user.id, confirmed: false, disputed: true },
        { onConflict: "duel_id,user_id" }
      );
      await load();
    }
    return { error: error?.message ?? null };
  };

  return {
    duels,
    loading,
    challengePlayer,
    respondToDuel,
    cancelDuel,
    submitResult,
    disputeResult,
    refetch: load,
  };
}

/**
 * NOTE ON STATS UPDATES:
 * Updating wins/losses/draws/win_rate/total_duels once BOTH
 * duel_confirmations agree is intentionally done in a Postgres
 * trigger/function (see supabase/schema.sql -> handle_duel_confirmation),
 * not in client code — so stats can never be forged by calling the
 * client update method directly. The client only ever submits its own
 * confirmation row.
 */
