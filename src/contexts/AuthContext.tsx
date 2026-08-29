import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { startPresenceHeartbeat } from "@/lib/presence";
import type { Profile } from "@/types/database";

interface RegisterInput {
  email: string;
  password: string;
  username: string;
  codNickname: string;
  codUid: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    input: RegisterInput
  ) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as unknown as Profile | null) ?? null);
  };

  useEffect(() => {
    let cleanupHeartbeat: (() => void) | undefined;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchProfile(data.session.user.id);
        cleanupHeartbeat = startPresenceHeartbeat(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: unknown, newSession: Session | null) => {
        setSession(newSession);
        if (newSession?.user) {
          fetchProfile(newSession.user.id);
          cleanupHeartbeat?.();
          cleanupHeartbeat = startPresenceHeartbeat(newSession.user.id);
        } else {
          setProfile(null);
          cleanupHeartbeat?.();
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
      cleanupHeartbeat?.();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async ({
    email,
    password,
    username,
    codNickname,
    codUid,
  }) => {
    // The matching profiles row is created automatically by a database
    // trigger (see supabase migration "auto_create_profile_on_signup")
    // reading these fields back out of auth.users' raw_user_meta_data.
    // This works whether or not email confirmation is required — a
    // client-side insert right after signUp() would fail under RLS
    // whenever there's no session yet (i.e. confirmation pending).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, cod_nickname: codNickname, cod_uid: codUid },
      },
    });
    if (error) return { error: error.message };

    if (data.user && !data.session) {
      // Email confirmation is required — there's no session yet, so
      // nothing more to do here until the user confirms and signs in.
      return { error: null, needsEmailConfirmation: true };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
