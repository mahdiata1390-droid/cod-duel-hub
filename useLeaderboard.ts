import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

export type LeaderboardSort = "wins" | "winRate" | "totalDuels" | "xp";

const sortColumn: Record<LeaderboardSort, string> = {
  wins: "wins",
  winRate: "wins", // win rate is computed client-side, pre-sorted by wins as a fallback
  totalDuels: "total_duels",
  xp: "xp",
};

export function useLeaderboard(sort: LeaderboardSort) {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .order(sortColumn[sort], { ascending: false })
      .limit(100)
      .then(({ data }) => {
        let rows = (data as Profile[]) ?? [];
        if (sort === "winRate") {
          rows = [...rows].sort((a, b) => winRate(b) - winRate(a));
        }
        setPlayers(rows);
        setLoading(false);
      });
  }, [sort]);

  return { players, loading };
}

export function winRate(p: Profile): number {
  if (p.total_duels === 0) return 0;
  return Math.round((p.wins / p.total_duels) * 100);
}
