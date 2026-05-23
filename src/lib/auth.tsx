import React, { createContext, useContext, useEffect, useState, useRef, useMemo, ReactNode } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { ACHIEVEMENT_THRESHOLDS, TIER_COLOR_STOPS, TIER_LABEL, TIER_ORDER, type MedalTier } from "@/lib/medals";
import { THEMES } from "@/lib/theme";

function FadeInScale({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity, delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], width: "100%", alignItems: "center" }}>
      {children}
    </Animated.View>
  );
}

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
  progressVersion: number;
  loading: boolean;
  sessionStartTime: number;
  dailyStreak: number;
  signUp: (nick: string, password: string) => Promise<{ error?: string }>;
  signIn: (nick: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshStats: () => Promise<void>;
  notifyProgressChanged: () => void;
  setSkillLevel: (level: string) => Promise<void>;
  setTheme: (theme: ThemeId) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const nickToEmail = (nick: string) => `${nick.trim().toLowerCase()}@cppquest.local`;

export function calculateLevelProgress(totalXp: number) {
  let level = 1;
  let remainingXp = totalXp;
  let requiredForNext = 5 + level;

  while (remainingXp >= requiredForNext) {
    remainingXp -= requiredForNext;
    level++;
    requiredForNext = 5 + level;
  }

  return {
    level,
    xpIntoLevel: remainingXp,
    requiredForNext,
  };
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progressVersion, setProgressVersion] = useState(0);
  const [activeAchievement, setActiveAchievement] = useState<MedalTier | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<MedalTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionStartTime] = useState<number>(Date.now());
  const [dailyStreak, setDailyStreak] = useState(0);
  const prevLevelRef = useRef<number | null>(null);

  const checkStreak = async (uid: string) => {
    try {
      const streakKey = `streak_${uid}`;
      const lastLoginKey = `lastLogin_${uid}`;
      
      const today = new Date().toISOString().split("T")[0];
      const lastLogin = await AsyncStorage.getItem(lastLoginKey);
      const currentStreakStr = await AsyncStorage.getItem(streakKey);
      let streak = parseInt(currentStreakStr || "0", 10);
      
      if (lastLogin !== today) {
        if (lastLogin) {
          const lastDate = new Date(lastLogin);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          
          if (lastLogin === yesterdayStr) {
            streak += 1;
          } else {
            streak = 1;
          }
        } else {
          streak = 1;
        }
        await AsyncStorage.setItem(lastLoginKey, today);
        await AsyncStorage.setItem(streakKey, streak.toString());
      }
      setDailyStreak(streak);
    } catch (e) {
      console.log("Streak check error", e);
    }
  };

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
    await checkStreak(uid);
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
        setActiveAchievement(null);
        setAchievementQueue([]);
        prevLevelRef.current = null;
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

  const unlockedAchievements = useMemo(() => {
    const level = stats?.level ?? 1;
    return TIER_ORDER.map((tier, index) => ({
      tier,
      threshold: ACHIEVEMENT_THRESHOLDS[index] ?? 9999,
      unlocked: level >= (ACHIEVEMENT_THRESHOLDS[index] ?? 9999),
    }));
  }, [stats?.level]);

  useEffect(() => {
    if (!stats) return; // Czekamy aż statystyki faktycznie załadują się z bazy

    const level = stats.level;
    if (prevLevelRef.current === null) {
      prevLevelRef.current = level;
      return;
    }

    const previousLevel = prevLevelRef.current;
    prevLevelRef.current = level;

    if (level <= previousLevel) return;

    const newlyUnlocked = unlockedAchievements
      .filter((achievement) => achievement.threshold > previousLevel && achievement.threshold <= level)
      .map((achievement) => achievement.tier);

    if (newlyUnlocked.length === 0) return;

    setAchievementQueue((prev) => {
      const existing = new Set<MedalTier>(prev);
      const next = [...prev];
      for (const tier of newlyUnlocked) {
        if (!existing.has(tier) && tier !== activeAchievement) next.push(tier);
      }
      return next;
    });
  }, [activeAchievement, stats, unlockedAchievements]);

  useEffect(() => {
    if (activeAchievement || achievementQueue.length === 0) return;
    const [next, ...rest] = achievementQueue;
    setActiveAchievement(next ?? null);
    setAchievementQueue(rest);
  }, [achievementQueue, activeAchievement]);

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

  const notifyProgressChanged = () => {
    setProgressVersion((prev) => prev + 1);
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
    
    // Nowy system levelowania: potrzebny XP = 5 + aktualny poziom
    const { level: nextLevel } = calculateLevelProgress(nextXp);

    await supabase
      .from("user_stats")
      .update({ xp: nextXp, level: nextLevel })
      .eq("user_id", user.id);
    setStats((prev) => ({
      user_id: user.id,
      xp: nextXp,
      level: nextLevel,
      theme: (prev?.theme ?? "midnight") as ThemeId,
    }));
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        stats,
        progressVersion,
        loading,
        sessionStartTime,
        dailyStreak,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshStats,
        notifyProgressChanged,
        setSkillLevel,
        setTheme,
        addXp,
      }}
    >
      {children}
      <GlobalAchievementOverlay
        tier={activeAchievement}
        themeId={(stats?.theme ?? "midnight") as ThemeId}
        level={stats?.level ?? 1}
        onClose={() => setActiveAchievement(null)}
      />
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be in AuthProvider");
  return c;
};

function GlobalAchievementOverlay({
  tier,
  themeId,
  level,
  onClose,
}: {
  tier: MedalTier | null;
  themeId: ThemeId;
  level: number;
  onClose: () => void;
}) {
  const theme = THEMES[themeId];
  const threshold = tier ? ACHIEVEMENT_THRESHOLDS[TIER_ORDER.indexOf(tier)] ?? 0 : 0;

  if (!tier) return null;

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: "absolute",
        inset: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: `${theme.colors.background}EE`,
      }}
    >
      <FadeInScale>
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
            borderRadius: 28,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            paddingHorizontal: 24,
            paddingVertical: 32,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          <MedalIcon tier={tier} size={112} borderColor={theme.colors.border} glowColor={theme.colors.primary} glowSize={112} />
          <Text
            style={{
              marginTop: 20,
              color: theme.colors.foreground,
              fontSize: 28,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Osiągnięcie odblokowane
          </Text>
          <Text
            style={{
              marginTop: 8,
              color: theme.colors.primary,
              fontSize: 22,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {TIER_LABEL[tier]}
          </Text>
          <Text
            style={{
              marginTop: 12,
              color: theme.colors.mutedForeground,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Wymagany poziom: {threshold}
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: theme.colors.mutedForeground,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Aktualny poziom: {level}
          </Text>
          <Text
            style={{
              marginTop: 10,
              color: theme.colors.mutedForeground,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Dotknij gdziekolwiek, aby zamknąć
          </Text>
        </View>
      </FadeInScale>
    </Pressable>
  );
}

function MedalIcon({
  tier,
  size,
  borderColor,
  glowColor,
  glowSize,
}: {
  tier: MedalTier;
  size: number;
  borderColor: string;
  glowColor: string;
  glowSize?: number;
}) {
  const [from, to] = TIER_COLOR_STOPS[tier];
  return (
    <View
      style={{
        width: size + 24,
        height: size + 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PulseGlow color={glowColor} size={glowSize ?? size + 16} minOpacity={0.12} maxOpacity={0.28} />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: from,
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[from, to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", inset: 0 }}
        />
        <Trophy color="rgba(15,10,20,0.7)" size={size * 0.46} />
      </View>
    </View>
  );
}

function PulseGlow({
  color,
  size,
  minOpacity = 0.1,
  maxOpacity = 0.4,
}: {
  color: string;
  size: number;
  minOpacity?: number;
  maxOpacity?: number;
}) {
  const scale1 = useRef(new Animated.Value(0.8)).current;
  const opacity1 = useRef(new Animated.Value(maxOpacity)).current;
  const scale2 = useRef(new Animated.Value(1.0)).current;
  const opacity2 = useRef(new Animated.Value(minOpacity)).current;

  useEffect(() => {
    const createPulse = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.25,
              duration: 2000,
              delay,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: minOpacity,
              duration: 2000,
              delay,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: maxOpacity,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const p1 = createPulse(scale1, opacity1, 0);
    const p2 = createPulse(scale2, opacity2, 1000);

    p1.start();
    p2.start();

    return () => {
      p1.stop();
      p2.stop();
    };
  }, [scale1, opacity1, scale2, opacity2, minOpacity, maxOpacity]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opacity1,
          transform: [{ scale: scale1 }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opacity2,
          transform: [{ scale: scale2 }],
        }}
      />
    </View>
  );
}
