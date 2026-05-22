import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LogOut, Award, Plus } from "lucide-react-native";
import { useAuth, type ThemeId } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { TIER_COLOR_STOPS, TIER_LABEL, TIER_ORDER, type MedalTier } from "@/lib/medals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useResponsive, useScreenLayout } from "@/lib/responsive";
import { useTheme } from "@/lib/theme";

export function ProfileTab() {
  const { profile, signOut, user, stats, setTheme } = useAuth();
  const { theme } = useTheme();
  const { breakpoint } = useResponsive();
  const { padding, maxWidth } = useScreenLayout();
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [quizStats, setQuizStats] = useState<{ avg: number; quizzes: number }>({ avg: 0, quizzes: 0 });
  const [goal, setGoal] = useState<string>("");
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [openAchievement, setOpenAchievement] = useState<MedalTier | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: lp }, { data: qa }, { data: goals }] = await Promise.all([
        supabase.from("level_progress").select("level_number").eq("user_id", user.id),
        supabase.from("quiz_attempts").select("correct,total").eq("user_id", user.id),
        supabase
          .from("learning_goals")
          .select("content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setLevelsCompleted(lp?.length ?? 0);
      const list = qa ?? [];
      if (list.length === 0) setQuizStats({ avg: 0, quizzes: 0 });
      else {
        const avg = list.reduce((s: number, r: any) => s + (r.correct / r.total), 0) / list.length;
        setQuizStats({ avg: Math.round(avg * 100), quizzes: list.length });
      }
      setGoal((goals?.[0] as any)?.content ?? "");
    })();
  }, [user]);

  const statCols = breakpoint === "sm" ? 2 : 4;
  const achievementCols = breakpoint === "sm" ? 3 : breakpoint === "md" ? 5 : 5;
  const achievementSize = breakpoint === "sm" ? 76 : breakpoint === "md" ? 84 : 92;

  const achievements = useMemo(() => {
    const level = stats?.level ?? 1;
    const thresholds = [10, 30, 50, 80, 100];
    return TIER_ORDER.map((tier, i) => ({
      tier,
      label: TIER_LABEL[tier],
      threshold: thresholds[i] ?? 9999,
      unlocked: level >= (thresholds[i] ?? 9999),
    }));
  }, [stats?.level]);

  const themeOptions: { id: ThemeId; label: string }[] = [
    { id: "midnight", label: "Midnight" },
    { id: "black", label: "Black" },
    { id: "charcoal", label: "Charcoal" },
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

  return (
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
              Level {stats?.level ?? 1} • {stats?.xp ?? 0} XP
            </Text>
          </View>
          <Button variant="ghost" size="icon" onPress={signOut}>
            <LogOut color="#f0ecf2" size={18} />
          </Button>
        </View>

        <View className="mb-6 flex-row flex-wrap -m-1">
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
            <Stat theme={theme} label="LEVELS" value={`${levelsCompleted}/100`} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
            <Stat theme={theme} label="AVG QUIZ" value={quizStats.quizzes ? `${quizStats.avg}%` : "—"} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
            <Stat theme={theme} label="QUIZZES" value={String(quizStats.quizzes)} />
          </View>
          <View className="p-1" style={{ width: `${100 / statCols}%` }}>
            <Stat theme={theme} label="XP" value={String(stats?.xp ?? 0)} />
          </View>
        </View>

        <View className="mb-3 flex-row items-center gap-2">
          <Award color="#a173e8" size={16} />
          <Text className="font-bold" style={{ color: theme.colors.foreground }}>
            Achievements
          </Text>
        </View>
        <View className="flex-row flex-wrap -m-1">
          {achievements.map((a) => (
            <View key={a.tier} className="p-1" style={{ width: `${100 / achievementCols}%` }}>
              <Pressable
                onPress={() => a.unlocked && setOpenAchievement(a.tier)}
                className="items-center"
              >
                <AchievementIcon
                  theme={theme}
                  tier={a.tier}
                  size={achievementSize}
                  locked={!a.unlocked}
                />
                <Text className="mt-2 text-xs font-semibold" style={{ color: theme.colors.foreground }}>
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
              Learning goals
            </Text>
            <Pressable onPress={() => setGoalDialogOpen(true)} className="flex-row items-center gap-2">
              <Plus color={theme.colors.primary} size={16} />
              <Text style={{ color: theme.colors.primary }}>Add</Text>
            </Pressable>
          </View>
          <Text className="mt-2 text-sm" style={{ color: theme.colors.mutedForeground }}>
            {goal?.trim()
              ? goal.trim()
              : "Set a personal goal — like \"finish OOP stage this month\" — to focus your sessions."}
          </Text>
        </View>

        <View
          className="mt-6 rounded-2xl border p-4"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
        >
          <Text className="font-bold" style={{ color: theme.colors.foreground }}>
            Theme
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

        <Dialog open={!!openAchievement} onOpenChange={(v) => !v && setOpenAchievement(null)}>
          {openAchievement && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Achievement: {TIER_LABEL[openAchievement]}</DialogTitle>
              </DialogHeader>
              <View className="items-center py-4">
                <AchievementIcon theme={theme} tier={openAchievement} size={128} locked={false} />
                <Text className="mt-4 text-center" style={{ color: theme.colors.foreground }}>
                  Odblokowane na poziomie{" "}
                  <Text className="font-bold">
                    {achievements.find((a) => a.tier === openAchievement)?.threshold}
                  </Text>
                </Text>
              </View>
            </DialogContent>
          )}
        </Dialog>

        <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Learning goal</DialogTitle>
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
}: {
  theme: { colors: any };
  tier: MedalTier;
  size: number;
  locked: boolean;
}) {
  const [from, to] = TIER_COLOR_STOPS[tier];
  const bg = locked ? theme.colors.muted : from;
  const overlay = locked ? theme.colors.border : to;
  const iconColor = locked ? theme.colors.mutedForeground : "rgba(15,10,20,0.7)";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 4,
        borderColor: theme.colors.border,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: overlay,
          opacity: 0.45,
        }}
      />
      <Award color={iconColor} size={size * 0.4} />
    </View>
  );
}
