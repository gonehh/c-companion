import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LogOut, Award } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { medalsEarned, TIER_COLOR_STOPS, type MedalTier } from "@/lib/medals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TRACKS } from "@/lib/cppCourse";

export function ProfileTab() {
  const { profile, signOut, user } = useAuth();
  const [levels, setLevels] = useState(0);
  const [stats, setStats] = useState<{ avg: number; quizzes: number }>({ avg: 0, quizzes: 0 });
  const [open, setOpen] = useState<MedalTier | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: lp }, { data: qa }] = await Promise.all([
        supabase.from("level_progress").select("level_number").eq("user_id", user.id),
        supabase.from("quiz_attempts").select("correct,total").eq("user_id", user.id),
      ]);
      setLevels(lp?.length ?? 0);
      const list = qa ?? [];
      if (list.length === 0) setStats({ avg: 0, quizzes: 0 });
      else {
        const avg = list.reduce((s: number, r: any) => s + (r.correct / r.total), 0) / list.length;
        setStats({ avg: Math.round(avg * 100), quizzes: list.length });
      }
    })();
  }, [user]);

  const medals = medalsEarned(levels);
  const trackLabel = TRACKS.find((t) => t.id === profile?.skill_level)?.label ?? "—";

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View className="mb-5 flex-row items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <View className="h-14 w-14 items-center justify-center rounded-full border border-primary bg-primary/30">
          <Text className="text-xl font-bold text-foreground">
            {profile?.nick?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
            {profile?.nick}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            Poziom: {trackLabel}
          </Text>
        </View>
        <Button variant="ghost" size="icon" onPress={signOut}>
          <LogOut color="#f0ecf2" size={18} />
        </Button>
      </View>

      <View className="mb-6 flex-row flex-wrap" style={{ gap: 12 }}>
        <Stat label="Ukończone poziomy" value={String(levels)} />
        <Stat label="Średnia z quizów" value={stats.quizzes ? `${stats.avg}%` : "—"} />
        <Stat label="Rozwiązane quizy" value={String(stats.quizzes)} />
        <Stat label="Medale" value={String(medals.length)} />
      </View>

      <View className="mb-3 flex-row items-center gap-2">
        <Award color="#a173e8" size={16} />
        <Text className="font-bold text-foreground">Medale</Text>
      </View>
      {medals.length === 0 ? (
        <View className="rounded-xl border border-border bg-card p-4">
          <Text className="text-sm text-muted-foreground">
            Ukończ 100 poziomów aby zdobyć pierwszy medal (Brąz). Z każdą setką poziomów dostajesz mocniejszy materiał: Brąz → Srebro → Złoto → Diament → Obsydian.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {medals.map((m) => (
            <Pressable
              key={m.tier}
              onPress={() => setOpen(m.tier)}
              className="items-center"
              style={{ width: "30%" }}
            >
              <Medal tier={m.tier} size={80} />
              <Text className="mt-2 text-xs font-semibold text-foreground">{m.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        {open && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Medal: {medals.find((m) => m.tier === open)?.label}</DialogTitle>
            </DialogHeader>
            <View className="items-center py-4">
              <Medal tier={open} size={112} />
              <Text className="mt-4 text-center text-foreground">
                Wykonałeś{" "}
                <Text className="font-bold">{medals.find((m) => m.tier === open)?.earnedAtLevels}</Text>{" "}
                poziomów!
              </Text>
            </View>
          </DialogContent>
        )}
      </Dialog>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="rounded-xl border border-border bg-card p-4"
      style={{ width: "47.5%" }}
    >
      <Text className="text-2xl font-bold text-primary">{value}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function Medal({ tier, size }: { tier: MedalTier; size: number }) {
  const [from, to] = TIER_COLOR_STOPS[tier];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 4,
        borderColor: "#3a2f4a",
        backgroundColor: from,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: to,
          opacity: 0.45,
        }}
      />
      <Award color="rgba(15,10,20,0.7)" size={size * 0.4} />
    </View>
  );
}
