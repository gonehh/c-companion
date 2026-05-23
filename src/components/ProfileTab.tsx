import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { LogOut, Trophy, Plus } from "lucide-react-native";
import { useAuth, type ThemeId } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENT_THRESHOLDS, TIER_COLOR_STOPS, TIER_LABEL, TIER_ORDER, type MedalTier } from "@/lib/medals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useResponsive, useScreenLayout } from "@/lib/responsive";
import { useTheme } from "@/lib/theme";

export function ProfileTab() {
  const { profile, signOut, user, stats, setTheme, refreshStats, notifyProgressChanged, addXp } = useAuth();
  const { theme } = useTheme();
  const { breakpoint } = useResponsive();
  const { padding, maxWidth } = useScreenLayout();
  const levelXp = 5;
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

  const statCols = breakpoint === "sm" ? 2 : 4;
  const achievementCols = breakpoint === "sm" ? 3 : breakpoint === "md" ? 5 : 5;
  const achievementSize = breakpoint === "sm" ? 76 : breakpoint === "md" ? 84 : 92;

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
  const currentLevel = Math.max(1, stats?.level ?? 1);
  const levelBaseXp = (currentLevel - 1) * levelXp;
  const xpIntoLevel = Math.max(0, totalXp - levelBaseXp);
  const xpMissing = Math.max(0, levelXp - xpIntoLevel);
  const progressPercent = Math.min(100, Math.max(0, (xpIntoLevel / levelXp) * 100));

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
      >
        <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <View
          className="mb-5 flex-row items-center gap-4 rounded-2xl border p-5"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
        >
          <View
            className="h-14 w-14 items-center justify-center rounded-full border"
            style={{ borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}4D` }}
          >
            <Text className="text-xl font-bold" style={{ color: theme.colors.foreground }}>
              {profile?.nick?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold" style={{ color: theme.colors.foreground }} numberOfLines={1}>
              {profile?.nick}
            </Text>
            <Text className="text-xs" style={{ color: theme.colors.mutedForeground }} numberOfLines={1}>
              Poziom {stats?.level ?? 1} • {stats?.xp ?? 0} XP
            </Text>
            <View className="mt-3">
              <Text className="mb-2 text-[11px]" style={{ color: theme.colors.mutedForeground }}>
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

        <View className="mb-6 flex-row flex-wrap -m-1">
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="POZIOM" value={String(stats?.level ?? 1)} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="ŚR. QUIZY" value={quizStats.quizzes ? `${quizStats.avg}%` : "—"} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="QUIZY" value={String(quizStats.quizzes)} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
              <Stat theme={theme} label="XP" value={String(stats?.xp ?? 0)} />
          </View>
        </View>

        <View className="mb-3 flex-row items-center gap-2">
          <Trophy color="#a173e8" size={16} />
          <Text className="font-bold" style={{ color: theme.colors.foreground }}>
            Osiągnięcia
          </Text>
        </View>
        <View className="flex-row flex-wrap -m-1">
          {achievements.map((a) => (
            <View key={a.tier} className="p-1" style={{ width: `${100 / achievementCols}%` }}>
              <Pressable
                onPress={() => a.unlocked && setOpenAchievement(a.tier)}
                className="items-center"
                style={{ opacity: a.unlocked ? 1 : 0.45 }}
              >
                <AchievementIcon
                  theme={theme}
                  tier={a.tier}
                  size={achievementSize}
                  locked={!a.unlocked}
                  pulse={a.unlocked}
                />
                <Text className="mt-2 text-xs font-semibold" style={{ color: a.unlocked ? theme.colors.foreground : theme.colors.mutedForeground }}>
                  {a.label}
                </Text>
                <Text className="text-[10px]" style={{ color: theme.colors.mutedForeground }}>
                  {a.threshold} lvls
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

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
          <Text className="font-bold" style={{ color: theme.colors.foreground }}>
            Motyw
          </Text>
          <View className="mt-3 flex-row gap-2">
            {themeOptions.map((t) => {
              const active = (stats?.theme ?? "midnight") === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTheme(t.id)}
                  className="flex-1 items-center justify-center rounded-full border py-2"
                  style={{
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    backgroundColor: active ? `${theme.colors.primary}33` : theme.colors.muted,
                  }}
                >
                  <Text style={{ color: theme.colors.foreground }}>{t.label}</Text>
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
            Zmiana XP przelicza poziom automatycznie według aktualnego progu: {levelXp} XP na poziom.
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
            <View className="items-center py-5">
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
          </DialogContent>
        )}
      </Dialog>
    </View>
  );
}

function Stat({ theme, label, value }: { theme: { colors: any }; label: string; value: string }) {
  return (
    <View className="rounded-xl border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
      <Text className="text-2xl font-bold" style={{ color: theme.colors.foreground }}>
        {value}
      </Text>
      <Text className="mt-1 text-xs" style={{ color: theme.colors.mutedForeground }}>
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
  const [from] = TIER_COLOR_STOPS[tier];
  const bg = locked ? `${theme.colors.muted}CC` : from;
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
          borderColor: locked ? `${theme.colors.border}99` : theme.colors.border,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Trophy color={iconColor} size={size * 0.46} />
      </View>
    </View>
  );
}

function PulseGlow({ color, size }: { color: string; size: number }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.18,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.9,
            duration: 1400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.1,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 1400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
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
  const glowOpacity = useRef(new Animated.Value(0.55)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [fillWidth, setFillWidth] = useState(0);
  const fillPixelWidth = fillWidth > 0 ? Math.max((progressPercent / 100) * fillWidth, progressPercent > 0 ? 10 : 0) : 0;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.95,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.55,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
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
          duration: 1400,
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
    outputRange: [-56, Math.max(fillPixelWidth - 24, -56)],
  });

  const currentLabelLeft = Math.min(
    Math.max((progressPercent / 100) * Math.max(fillWidth, 1) - 14, 0),
    Math.max(fillWidth - 28, 0),
  );

  return (
    <View>
      <View
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          setFillWidth(width);
        }}
        className="h-4 overflow-hidden rounded-full"
        style={{ backgroundColor: theme.colors.muted, borderWidth: 1, borderColor: theme.colors.border }}
      >
        <Animated.View
          style={{
            height: "100%",
            width: fillPixelWidth,
            backgroundColor: theme.colors.primary,
            opacity: glowOpacity,
            overflow: "hidden",
            borderRadius: 999,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: `${theme.colors.accent}66`,
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 56,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.28)",
              transform: [{ translateX: highlightTranslate }],
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 26,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.14)",
              transform: [{ translateX: Animated.add(highlightTranslate, new Animated.Value(16)) }],
            }}
          />
        </Animated.View>
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
