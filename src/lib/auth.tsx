import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  nick: string;
  skill_level: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (nick: string, password: string) => Promise<{ error?: string }>;
  signIn: (nick: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSkillLevel: (level: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const nickToEmail = (nick: string) => `${nick.trim().toLowerCase()}@cppquest.local`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
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

  const setSkillLevel = async (level: string) => {
    if (!user) return;
    await supabase.from("profiles").update({ skill_level: level }).eq("id", user.id);
    await loadProfile(user.id);
  };

  return (
    <Ctx.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile, setSkillLevel }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be in AuthProvider");
  return c;
};
