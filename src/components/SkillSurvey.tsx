import { View, Text, Pressable, ScrollView } from "react-native";
import { TRACKS, type Track } from "@/lib/cppCourse";
import { useAuth } from "@/lib/auth";

export function SkillSurvey() {
  const { setSkillLevel } = useAuth();
  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View className="mx-auto w-full max-w-md">
        <Text className="mb-2 text-2xl font-bold text-foreground">Na jakim poziomie jesteś?</Text>
        <Text className="mb-6 text-sm text-muted-foreground">Wybierz odpowiedź — dopasujemy poziom trudności.</Text>
        <View className="gap-3">
          {TRACKS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setSkillLevel(t.id)}
              className="rounded-xl border border-border bg-card p-4 active:bg-secondary"
            >
              <Text className="font-semibold text-foreground">{t.label}</Text>
              <Text className="mt-1 text-sm text-muted-foreground">{t.desc}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export const isValidTrack = (s: string | null | undefined): s is Track =>
  s === "beginner" || s === "basic" || s === "intermediate" || s === "advanced";
