import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

interface UsePlayersOptions {
  onlineOnly?: boolean;
}

export function usePlayers(query: string, options: UsePlayersOptions = {}) {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);

    let request = supabase.from("profiles").select("*").order("xp", { ascending: false });

    if (query.trim()) {
      const q = query.trim();
      // Search across username, COD nickname, and COD UID
      request = request.or(
        `username.ilike.%${q}%,cod_nickname.ilike.%${q}%,cod_uid.ilike.%${q}%`
      );
    }

    const { data, error: err } = await request.limit(60);

    if (err) {
      setError(err.message);
      setPlayers([]);
    } else {
      let rows = (data as Profile[]) ?? [];
      if (options.onlineOnly) {
        const threshold = Date.now() - 2 * 60 * 1000;
        rows = rows.filter((p) => new Date(p.last_seen_at).getTime() > threshold);
      }
      setPlayers(rows);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, options.onlineOnly]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return { players, loading, error, refetch: fetchPlayers };
}

export function useProfileByIdentifier(identifier: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", identifier)
      .single()
      .then(({ data, error: err }: { data: any; error: any }) => {
        setProfile((data as unknown as Profile | null) ?? null);
        setError(err?.message ?? null);
        setLoading(false);
      });
  }, [identifier]);

  return { profile, loading, error };
}
