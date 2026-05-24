import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

function FadeInScale({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 350,
        delay,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
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
import { LogOut, Trophy, Plus, Flame, Clock, Palette } from "lucide-react-native";
import { useAuth, calculateLevelProgress, type ThemeId } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENT_THRESHOLDS, TIER_COLOR_STOPS, TIER_LABEL, TIER_ORDER, type MedalTier } from "@/lib/medals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useResponsive, useScreenLayout } from "@/lib/responsive";
import { useTheme } from "@/lib/theme";

export function ProfileTab() {
  const { profile, signOut, user, stats, sessionStartTime, dailyStreak, setTheme, refreshStats, notifyProgressChanged, addXp } = useAuth();
  const { theme } = useTheme();
  const { breakpoint } = useResponsive();
  const { padding, maxWidth } = useScreenLayout();
  const [quizStats, setQuizStats] = useState<{ avg: number; quizzes: number }>({ avg: 0, quizzes: 0 });
  const [goal, setGoal] = useState<string>("");
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [resettingProgress, setResettingProgress] = useState(false);
  const [openAchievement, setOpenAchievement] = useState<MedalTier | null>(null);
  const [debugXpInput, setDebugXpInput] = useState("");
  const [updatingDebugXp, setUpdatingDebugXp] = useState(false);

  const loadProfileSnapshot = async () => {
    if (!user) return;
    const [{ data: sq }, { data: ex }, { data: goals }] = await Promise.all([
      supabase.from("stage_quiz_attempts").select("correct,total").eq("user_id", user.id),
      supabase.from("exam_attempts").select("correct,total").eq("user_id", user.id),
      supabase
        .from("learning_goals")
        .select("content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    const list = [...(sq ?? []), ...(ex ?? [])] as any[];
    if (list.length === 0) setQuizStats({ avg: 0, quizzes: 0 });
    else {
      const avg = list.reduce((s: number, r: any) => s + (r.correct / r.total), 0) / list.length;
      setQuizStats({ avg: Math.round(avg * 100), quizzes: list.length });
    }
    setGoal((goals?.[0] as any)?.content ?? "");
  };

  useEffect(() => {
    if (!user) return;
    loadProfileSnapshot();
  }, [user]);

  const isMobile = breakpoint === "sm";
  const statCols = 4; // Always 4 columns to fit desktop layout

  const achievements = useMemo(() => {
    const level = stats?.level ?? 1;
    return TIER_ORDER.map((tier, i) => ({
      tier,
      label: TIER_LABEL[tier],
      threshold: ACHIEVEMENT_THRESHOLDS[i] ?? 9999,
      unlocked: level >= (ACHIEVEMENT_THRESHOLDS[i] ?? 9999),
    }));
  }, [stats?.level]);

  const themeOptions: { id: ThemeId; label: string }[] = [
    { id: "midnight", label: "Północ" },
    { id: "black", label: "Czerń" },
    { id: "charcoal", label: "Grafit" },
  ];

  const saveGoal = async () => {
    if (!user) return;
    const text = goal.trim();
    if (!text) return;
    setSavingGoal(true);
    const { error } = await supabase.from("learning_goals").insert({ user_id: user.id, content: text });
    setSavingGoal(false);
    if (error) return;
    setGoalDialogOpen(false);
  };

  const resetProgress = async () => {
    if (!user || resettingProgress) return;
    setResettingProgress(true);
    const themeId = (stats?.theme ?? "midnight") as ThemeId;
    const [lessonsRes, quizRes, examRes, statsRes] = await Promise.all([
      supabase.from("lesson_progress").delete().eq("user_id", user.id),
      supabase.from("stage_quiz_attempts").delete().eq("user_id", user.id),
      supabase.from("exam_attempts").delete().eq("user_id", user.id),
      supabase.from("user_stats").upsert({ user_id: user.id, xp: 0, level: 1, theme: themeId }, { onConflict: "user_id" }),
    ]);
    setResettingProgress(false);

    const error = lessonsRes.error || quizRes.error || examRes.error || statsRes.error;
    if (error) {
      const msg = typeof error.message === "string" && error.message.trim().length
        ? error.message
        : "Nie udało się zresetować progresu";
      const code = typeof error.code === "string" && error.code.trim().length ? ` (${error.code})` : "";
      toast.error(`${msg}${code}`);
      return;
    }

    setQuizStats({ avg: 0, quizzes: 0 });
    await refreshStats();
    await loadProfileSnapshot();
    notifyProgressChanged();
    toast.success("Zresetowano progres, level i XP");
  };

  const applyDebugXpChange = async (direction: 1 | -1) => {
    const amount = Number.parseInt(debugXpInput.trim(), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Wpisz poprawną liczbę XP");
      return;
    }

    setUpdatingDebugXp(true);
    await addXp(direction * amount);
    setUpdatingDebugXp(false);
    setDebugXpInput("");
    toast.success(direction > 0 ? `Dodano ${amount} XP` : `Odjęto ${amount} XP`);
  };

  const activeAchievement = openAchievement
    ? achievements.find((achievement) => achievement.tier === openAchievement) ?? null
    : null;
  const totalXp = Math.max(0, stats?.xp ?? 0);
  const { level: currentLevel, xpIntoLevel, requiredForNext: levelXp } = calculateLevelProgress(totalXp);
  const xpMissing = Math.max(0, levelXp - xpIntoLevel);
  const progressPercent = Math.min(100, Math.max(0, (xpIntoLevel / levelXp) * 100));

  const [sessionMinutes, setSessionMinutes] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      setSessionMinutes(Math.floor((Date.now() - sessionStartTime) / 60000));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: "transparent" }}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
      >
        <LinearGradient
          colors={[`${theme.colors.primary}22`, "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.3 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: 400 }}
          pointerEvents="none"
        />
        <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <View
          className={`mb-4 flex-row items-center gap-3 rounded-2xl border ${isMobile ? 'p-4' : 'p-5'} overflow-hidden`}
          style={{ borderColor: theme.colors.border, backgroundColor: `${theme.colors.card}CC` }}
        >
          <View
            className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} items-center justify-center rounded-full overflow-hidden`}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent ?? theme.colors.card]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: "absolute", inset: 0 }}
            />
            <Text className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`} style={{ color: "#fff" }}>
              {profile?.nick?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className={`${isMobile ? 'text-base' : 'text-lg'} font-bold`} style={{ color: theme.colors.foreground }} numberOfLines={1}>
              {profile?.nick}
            </Text>
            <Text className="text-xs" style={{ color: theme.colors.mutedForeground }} numberOfLines={1}>
              Poziom {stats?.level ?? 1} • {stats?.xp ?? 0} XP
            </Text>
            <View className="mt-2">
              <Text className="mb-1 text-[10px]" style={{ color: theme.colors.mutedForeground }}>
                Brakuje {xpMissing} XP do poziomu {currentLevel + 1}
              </Text>
              <LevelProgressBar
                theme={theme}
                progressPercent={progressPercent}
                currentXp={xpIntoLevel}
                targetXp={levelXp}
              />
            </View>
          </View>
          <Button variant="ghost" size="icon" onPress={signOut}>
            <LogOut color="#f0ecf2" size={18} />
          </Button>
        </View>

        <View className="mb-4 flex-row flex-wrap -m-1">
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="POZIOM" value={String(stats?.level ?? 1)} isMobile={isMobile} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="ŚR. QUIZY" value={quizStats.quizzes ? `${quizStats.avg}%` : "—"} isMobile={isMobile} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="QUIZY" value={String(quizStats.quizzes)} isMobile={isMobile} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="XP" value={String(stats?.xp ?? 0)} isMobile={isMobile} />
          </View>
        </View>

        <View className="mb-5 flex-row gap-2">
          <View className={`flex-1 rounded-2xl border ${isMobile ? 'p-3' : 'p-4'} flex-row items-center overflow-hidden`} style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
            <View className={`${isMobile ? 'mr-2' : 'mr-4'}`}>
              <View style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, alignItems: "center", justifyContent: "center" }}>
                <PulseGlow color="#ff6b00" size={isMobile ? 48 : 64} minOpacity={0.1} maxOpacity={0.4} />
                <View style={{
                  width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: isMobile ? 18 : 24, 
                  backgroundColor: "rgba(255,107,0,0.1)", 
                  borderWidth: 2, borderColor: "#ff6b00",
                  alignItems: "center", justifyContent: "center"
                }}>
                  <Flame color="#ff6b00" size={isMobile ? 18 : 24} />
                </View>
              </View>
            </View>
            <View className="flex-1">
              <Text className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`} style={{ color: theme.colors.foreground }} numberOfLines={1} adjustsFontSizeToFit>
                {dailyStreak} {dailyStreak === 1 ? "dzień" : "dni"}
              </Text>
              <Text className={`${isMobile ? 'text-[10px]' : 'text-xs'}`} style={{ color: theme.colors.mutedForeground }} numberOfLines={1}>
                Streak daily
              </Text>
            </View>
          </View>

          <View className={`flex-1 rounded-2xl border ${isMobile ? 'p-3' : 'p-4'} flex-row items-center`} style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
            <View className={`${isMobile ? 'mr-2 h-9 w-9' : 'mr-4 h-12 w-12'} items-center justify-center rounded-full`} style={{ backgroundColor: `${theme.colors.primary}22` }}>
              <Clock color={theme.colors.primary} size={isMobile ? 18 : 24} />
            </View>
            <View className="flex-1">
              <Text className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`} style={{ color: theme.colors.foreground }} numberOfLines={1} adjustsFontSizeToFit>
                {sessionMinutes} min
              </Text>
              <Text className={`${isMobile ? 'text-[10px]' : 'text-xs'}`} style={{ color: theme.colors.mutedForeground }} numberOfLines={1}>
                Time session
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-3 flex-row items-center gap-2">
          <Trophy color="#a173e8" size={16} />
          <Text className="font-bold" style={{ color: theme.colors.foreground }}>
            Osiągnięcia
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 -mx-1" contentContainerStyle={{ paddingHorizontal: 4 }}>
          {achievements.map((a) => (
            <View key={a.tier} className="p-1" style={{ width: isMobile ? 85 : 110 }}>
              <Pressable
                onPress={() => a.unlocked && setOpenAchievement(a.tier)}
                className="items-center"
                style={{ opacity: a.unlocked ? 1 : 0.45 }}
              >
                <AchievementIcon
                  theme={theme}
                  tier={a.tier}
                  size={isMobile ? 64 : 84}
                  locked={!a.unlocked}
                  pulse={a.unlocked}
                />
                <Text className={`mt-2 ${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold text-center`} style={{ color: a.unlocked ? theme.colors.foreground : theme.colors.mutedForeground }} numberOfLines={1}>
                  {a.label}
                </Text>
                <Text className="text-[9px]" style={{ color: theme.colors.mutedForeground }}>
                  {a.threshold} lvls
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View
          className="mt-6 rounded-2xl border p-4"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-bold" style={{ color: theme.colors.foreground }}>
              Cele nauki
            </Text>
            <Pressable onPress={() => setGoalDialogOpen(true)} className="flex-row items-center gap-2">
              <Plus color={theme.colors.primary} size={16} />
              <Text style={{ color: theme.colors.primary }}>Dodaj</Text>
            </Pressable>
          </View>
          <Text className="mt-2 text-sm" style={{ color: theme.colors.mutedForeground }}>
            {goal?.trim()
              ? goal.trim()
              : "Ustaw cel — np. „ukończyć OOP w tym miesiącu” — żeby lepiej planować naukę."}
          </Text>
        </View>

        <View
          className="mt-6 rounded-2xl border p-4"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
        >
          <View className="mb-4 flex-row items-center gap-2">
            <Palette color={theme.colors.mutedForeground} size={18} />
            <Text className="text-base font-medium" style={{ color: theme.colors.mutedForeground }}>
              Motyw
            </Text>
          </View>
          <View className="flex-row gap-3">
            {themeOptions.map((t) => {
              const active = (stats?.theme ?? "midnight") === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTheme(t.id)}
                  className="flex-1 items-center justify-center rounded-full border py-2.5 overflow-hidden"
                  style={(state) => [
                    {
                      borderColor: active ? theme.colors.primary : "transparent",
                      backgroundColor: active ? `${theme.colors.primary}1A` : theme.colors.muted,
                    },
                    state.pressed && { opacity: 0.8 },
                    (state as any).hovered && { opacity: 0.9 },
                  ]}
                >
                  <Text className="text-sm font-medium" style={{ color: active ? "#fff" : theme.colors.foreground }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          className="mt-6 rounded-2xl border p-4"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
        >
          <Text className="font-bold" style={{ color: theme.colors.foreground }}>
            Debug
          </Text>
          <Text className="mt-2 text-sm" style={{ color: theme.colors.mutedForeground }}>
            Resetuje cały progres kursu, quizy, egzaminy, XP i poziom. Motyw zostaje bez zmian.
          </Text>
          <Text className="mt-3 text-sm" style={{ color: theme.colors.mutedForeground }}>
            Zmiana XP przelicza poziom automatycznie według aktualnego progu: 5 + level XP na poziom.
          </Text>
          <TextInput
            value={debugXpInput}
            onChangeText={(text) => setDebugXpInput(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="Np. 5"
            placeholderTextColor={theme.colors.mutedForeground}
            style={{
              marginTop: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.muted,
              color: theme.colors.foreground,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
          <View className="mt-3 flex-row gap-2">
            <Button className="flex-1" onPress={() => applyDebugXpChange(1)} loading={updatingDebugXp} disabled={updatingDebugXp}>
              Dodaj XP
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onPress={() => applyDebugXpChange(-1)}
              loading={updatingDebugXp}
              disabled={updatingDebugXp}
            >
              Odejmij XP
            </Button>
          </View>
          <Button className="mt-4" variant="destructive" onPress={resetProgress} loading={resettingProgress} disabled={resettingProgress}>
            Resetuj progres
          </Button>
        </View>

        <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cel nauki</DialogTitle>
            </DialogHeader>
            <View className="gap-3">
              <Textarea value={goal} onChangeText={setGoal} numberOfLines={4} placeholder="Np. ukończyć OOP w tym miesiącu" />
              <Button onPress={saveGoal} loading={savingGoal} disabled={savingGoal || !goal.trim()}>
                Zapisz
              </Button>
            </View>
          </DialogContent>
        </Dialog>
        </View>
      </ScrollView>

      <Dialog open={!!activeAchievement} onOpenChange={(v) => !v && setOpenAchievement(null)}>
        {activeAchievement && (
          <DialogContent>
            <FadeInScale>
              <View className="items-center py-5 w-full">
                <AchievementIcon theme={theme} tier={activeAchievement.tier} size={96} locked={false} pulse />
                <Text className="mt-4 text-center text-xl font-bold" style={{ color: theme.colors.foreground }}>
                  {activeAchievement.label}
                </Text>
                <Text className="mt-2 text-center text-sm" style={{ color: theme.colors.mutedForeground }}>
                  Wymagany poziom: {activeAchievement.threshold}
                </Text>
                <Text className="mt-1 text-center text-sm" style={{ color: theme.colors.mutedForeground }}>
                  Status: odblokowane
                </Text>
                <Button className="mt-5 w-full" onPress={() => setOpenAchievement(null)}>
                  Zamknij
                </Button>
              </View>
            </FadeInScale>
          </DialogContent>
        )}
      </Dialog>
    </View>
  );
}

function Stat({ theme, label, value, isMobile }: { theme: { colors: any }; label: string; value: string; isMobile?: boolean }) {
  return (
    <View className={`rounded-xl border ${isMobile ? 'p-2' : 'p-4'} items-center justify-center`} style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
      <Text className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`} style={{ color: theme.colors.foreground }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className={`mt-1 ${isMobile ? 'text-[9px]' : 'text-xs'}`} style={{ color: theme.colors.mutedForeground, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

function AchievementIcon({
  theme,
  tier,
  size,
  locked,
  pulse = false,
}: {
  theme: { colors: any };
  tier: MedalTier;
  size: number;
  locked: boolean;
  pulse?: boolean;
}) {
  const [from, to] = TIER_COLOR_STOPS[tier];
  const iconColor = locked ? theme.colors.mutedForeground : "rgba(15,10,20,0.7)";
  return (
    <View
      style={{
        width: size + 24,
        height: size + 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {pulse && !locked && <PulseGlow color={theme.colors.primary} size={size + 16} />}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: locked ? `${theme.colors.border}99` : from,
          backgroundColor: locked ? `${theme.colors.muted}CC` : "transparent",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {!locked && (
          <LinearGradient
            colors={[from, to]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 }}
          />
        )}
        <Trophy color={iconColor} size={size * 0.46} />
      </View>
    </View>
  );
}

function PulseGlow({
  color,
  size,
  minOpacity = 0.3,
  maxOpacity = 0.6,
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
              toValue: 1.3,
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
              toValue: 0,
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
  }, [scale1, opacity1, scale2, opacity2]);

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

function LevelProgressBar({
  theme,
  progressPercent,
  currentXp,
  targetXp,
}: {
  theme: { colors: any };
  progressPercent: number;
  currentXp: number;
  targetXp: number;
}) {
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [fillWidth, setFillWidth] = useState(0);
  const fillPixelWidth = fillWidth > 0 ? Math.max((progressPercent / 100) * fillWidth, progressPercent > 0 ? 10 : 0) : 0;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.85,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [glowOpacity]);

  useEffect(() => {
    if (fillPixelWidth <= 0) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [fillPixelWidth, sweep]);

  const highlightTranslate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, Math.max(fillPixelWidth + 80, -80)],
  });

  const currentLabelLeft = Math.min(
    Math.max((progressPercent / 100) * Math.max(fillWidth, 1) - 14, 0),
    Math.max(fillWidth - 28, 0),
  );

  return (
    <View>
      {/* Background Track */}
      <View
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          setFillWidth(width);
        }}
        className="h-5 rounded-full"
        style={{ backgroundColor: theme.colors.muted, borderWidth: 1, borderColor: theme.colors.border }}
      >
        {/* Glow Layer behind the fill */}
        <Animated.View
          style={{
            position: "absolute",
            height: "100%",
            width: fillPixelWidth,
            backgroundColor: theme.colors.primary,
            opacity: glowOpacity,
            borderRadius: 999,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 12,
            elevation: 8,
          }}
        />
        
        {/* Actual Fill Layer */}
        <View
          style={{
            height: "100%",
            width: fillPixelWidth,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent ?? theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: "absolute", inset: 0 }}
          />
          
          {/* Sweeping Shiny Highlight */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 80,
              transform: [{ translateX: highlightTranslate }],
            }}
          >
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.7)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: "100%", height: "100%" }}
            />
          </Animated.View>
        </View>
      </View>

      <View className="relative mt-2 h-5">
        <Text
          className="absolute left-0 text-[11px]"
          style={{ color: theme.colors.mutedForeground }}
        >
          0
        </Text>
        <Text
          className="absolute text-[11px] font-semibold"
          style={{ left: currentLabelLeft, color: theme.colors.primary }}
        >
          {currentXp}
        </Text>
        <Text
          className="absolute right-0 text-[11px]"
          style={{ color: theme.colors.mutedForeground }}
        >
          {targetXp}
        </Text>
      </View>
    </View>
  );
}
