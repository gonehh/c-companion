import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  nick: string;
  skill_level: string | null;
}

export type ThemeId = "midnight" | "black" | "charcoal";

interface UserStats {
  user_id: string;
  xp: number;
  level: number;
  theme: ThemeId;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  stats: UserStats | null;
  loading: boolean;
  signUp: (nick: string, password: string) => Promise<{ error?: string }>;
  signIn: (nick: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setSkillLevel: (level: string) => Promise<void>;
  setTheme: (theme: ThemeId) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const nickToEmail = (nick: string) => `${nick.trim().toLowerCase()}@cppquest.local`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureStats = async (uid: string) => {
    await supabase.from("user_stats").upsert({ user_id: uid }, { onConflict: "user_id" });
    const { data } = await supabase.from("user_stats").select("*").eq("user_id", uid).maybeSingle();
    setStats((data as UserStats | null) ?? null);
  };

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_stats").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile((p as Profile | null) ?? null);
    if (!s) await ensureStats(uid);
    else setStats((s as UserStats | null) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setStats(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp: AuthCtx["signUp"] = async (nick, password) => {
    const cleanNick = nick.trim();
    if (cleanNick.length < 3) return { error: "Nick musi mieć co najmniej 3 znaki." };
    if (password.length < 6) return { error: "Hasło musi mieć co najmniej 6 znaków." };
    const { data: exists } = await supabase.rpc("nick_exists", { _nick: cleanNick });
    if (exists) return { error: "Ten nick jest już zajęty." };
    const { data, error } = await supabase.auth.signUp({
      email: nickToEmail(cleanNick),
      password,
    });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: pErr } = await supabase
        .from("profiles")
        .insert({ id: data.user.id, nick: cleanNick });
      if (pErr) return { error: pErr.message };
      await ensureStats(data.user.id);
    }
    return {};
  };

  const signIn: AuthCtx["signIn"] = async (nick, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: nickToEmail(nick),
      password,
    });
    if (error) return { error: "Zły nick lub hasło." };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const refreshStats = async () => {
    if (user) await ensureStats(user.id);
  };

  const setSkillLevel = async (level: string) => {
    if (!user) return;
    await supabase.from("profiles").update({ skill_level: level }).eq("id", user.id);
    await loadProfile(user.id);
  };

  const setTheme = async (theme: ThemeId) => {
    if (!user) return;
    await supabase.from("user_stats").update({ theme }).eq("user_id", user.id);
    await ensureStats(user.id);
  };

  const addXp = async (amount: number) => {
    if (!user) return;
    const currentXp = stats?.xp ?? 0;
    const nextXp = Math.max(0, currentXp + amount);
    const nextLevel = Math.floor(nextXp / 100) + 1;
    await supabase
      .from("user_stats")
      .update({ xp: nextXp, level: nextLevel })
      .eq("user_id", user.id);
    setStats((prev) => (prev ? { ...prev, xp: nextXp, level: nextLevel } : prev));
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        stats,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshStats,
        setSkillLevel,
        setTheme,
        addXp,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be in AuthProvider");
  return c;
};
