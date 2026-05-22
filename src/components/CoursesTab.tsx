import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { ArrowLeft, CheckCircle2, Lock, Sparkles } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { isValidTrack, SkillSurvey } from "./SkillSurvey";
import { buildLevels, buildQuiz, TRACKS, type Track, type Level, type Question } from "@/lib/cppCourse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { useResponsive, useScreenLayout } from "@/lib/responsive";
import { cn } from "@/lib/utils";

type ViewState =
  | { kind: "list" }
  | { kind: "level"; n: number }
  | { kind: "quiz"; index: number };

export function CoursesTab() {
  const { profile, user } = useAuth();
  const { breakpoint } = useResponsive();
  const { padding, maxWidth } = useScreenLayout();
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [quizDone, setQuizDone] = useState<Set<number>>(new Set());
  const [view, setView] = useState<ViewState>({ kind: "list" });
  const [loading, setLoading] = useState(true);

  const track: Track | null = isValidTrack(profile?.skill_level) ? (profile!.skill_level as Track) : null;
  const levels = useMemo(() => (track ? buildLevels(track) : []), [track]);

  const loadProgress = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: lp }, { data: qa }] = await Promise.all([
      supabase.from("level_progress").select("level_number").eq("user_id", user.id),
      supabase.from("quiz_attempts").select("quiz_number").eq("user_id", user.id),
    ]);
    setCompleted(new Set((lp ?? []).map((r: any) => r.level_number)));
    setQuizDone(new Set((qa ?? []).map((r: any) => r.quiz_number)));
    setLoading(false);
  };

  useEffect(() => {
    loadProgress();
  }, [user]);

  if (!track) return <SkillSurvey />;

  const trackInfo = TRACKS.find((t) => t.id === track)!;
  const total = levels.length;
  const doneCount = completed.size;
  const nextLevel = (() => {
    for (let i = 1; i <= total; i++) if (!completed.has(i)) return i;
    return null;
  })();

  const isUnlocked = (n: number) => {
    if (n === 1) return true;
    if (!completed.has(n - 1)) return false;
    if ((n - 1) % 10 === 0) {
      const qIdx = (n - 1) / 10 - 1;
      if (!quizDone.has(qIdx)) return false;
    }
    return true;
  };

  if (view.kind === "level") {
    const lvl = levels[view.n - 1];
    return (
      <LevelView
        level={lvl}
        onBack={() => setView({ kind: "list" })}
        onComplete={async () => {
          if (!user) return;
          if (!completed.has(lvl.n)) {
            await supabase.from("level_progress").insert({ user_id: user.id, level_number: lvl.n });
          }
          await loadProgress();
          toast.success(`Poziom ${lvl.n} ukończony!`);
          if (lvl.n % 10 === 0) {
            setView({ kind: "quiz", index: lvl.n / 10 - 1 });
          } else {
            setView({ kind: "list" });
          }
        }}
      />
    );
  }

  if (view.kind === "quiz") {
    const qs = buildQuiz(track, view.index);
    return (
      <QuizView
        index={view.index}
        questions={qs}
        onBack={() => setView({ kind: "list" })}
        onDone={async (correct) => {
          if (!user) return;
          await supabase.from("quiz_attempts").insert({
            user_id: user.id,
            quiz_number: view.index,
            correct,
            total: qs.length,
          });
          await loadProgress();
          toast.success(`Quiz zaliczony! ${correct}/${qs.length}`);
          setView({ kind: "list" });
        }}
      />
    );
  }

  const levelCols = breakpoint === "sm" ? 4 : breakpoint === "md" ? 6 : 8;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <View className="mb-5">
          <Text className="mb-1 text-xs uppercase tracking-wider text-primary">Twój tor</Text>
          <Text className="text-xl font-bold text-foreground">{trackInfo.label}</Text>
          <Text className="mt-1 text-sm text-muted-foreground">{trackInfo.desc}</Text>
        </View>

        <View className="mb-5 rounded-2xl border border-border bg-card p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Postęp</Text>
            <Text className="text-sm font-semibold text-foreground">
              {doneCount} / {total}
            </Text>
          </View>
          <Progress value={(doneCount / total) * 100} />
          {nextLevel && (
            <Button
              className="mt-4 w-full"
              onPress={() => setView({ kind: "level", n: nextLevel })}
              disabled={!isUnlocked(nextLevel)}
            >
              <Sparkles color="#fafafa" size={16} />
              <Text className="text-sm font-semibold text-primary-foreground">
                {isUnlocked(nextLevel) ? `Kontynuuj — Poziom ${nextLevel}` : "Najpierw quiz!"}
              </Text>
            </Button>
          )}
        </View>

        {loading ? (
          <Text className="py-10 text-center text-muted-foreground">Ładowanie...</Text>
        ) : (
          <View className="flex-row flex-wrap -m-1">
            {levels.map((lvl) => {
              const done = completed.has(lvl.n);
              const unlocked = isUnlocked(lvl.n);
              const isQuizGate = lvl.n % 10 === 0;
              return (
                <View key={lvl.n} className="p-1" style={{ width: `${100 / levelCols}%` }}>
                  <Pressable
                    disabled={!unlocked}
                    onPress={() => setView({ kind: "level", n: lvl.n })}
                    style={{ aspectRatio: 1 }}
                    className={cn(
                      "items-center justify-center rounded-xl border",
                      done
                        ? "border-primary bg-primary/30"
                        : unlocked
                          ? "border-border bg-card active:bg-secondary"
                          : "border-border bg-muted/50 opacity-50",
                      isQuizGate && "border-2 border-accent/70",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 color="#a173e8" size={14} />
                    ) : !unlocked ? (
                      <Lock color="#a89fb5" size={12} />
                    ) : null}
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        done || unlocked ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {lvl.n}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View className="mt-6 gap-2">
          {Array.from({ length: 10 }).map((_, i) => {
            const blockStart = i * 10 + 1;
            const blockEnd = (i + 1) * 10;
            const ready =
              blockEnd <= doneCount ||
              Array.from({ length: 10 }).every((_, k) => completed.has(blockStart + k));
            const done = quizDone.has(i);
            if (!ready) return null;
            return (
              <Pressable
                key={i}
                onPress={() => setView({ kind: "quiz", index: i })}
                className={cn(
                  "flex-row items-center justify-between rounded-xl border p-3",
                  done ? "border-primary/50 bg-primary/20" : "border-accent bg-accent/30",
                )}
              >
                <Text className="font-semibold text-foreground">
                  Quiz {i + 1} — poziomy {blockStart}–{blockEnd}
                </Text>
                <Text className="text-xs text-muted-foreground">{done ? "Zaliczony" : "Rozwiąż"}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function LevelView({
  level,
  onBack,
  onComplete,
}: {
  level: Level;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { padding, maxWidth } = useScreenLayout();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1">
          <ArrowLeft color="#a89fb5" size={16} />
          <Text className="text-sm text-muted-foreground">wstecz</Text>
        </Pressable>
        <Text className="mb-1 text-xs uppercase tracking-wider text-primary">Poziom {level.n}</Text>
        <Text className="mb-3 text-xl font-bold text-foreground">{level.title}</Text>
        <Text className="mb-4 text-sm leading-relaxed text-foreground">{level.lesson}</Text>
        {level.example && (
          <View className="mb-5 rounded-lg border border-border bg-muted p-3">
            <Text className="text-xs text-foreground" style={{ fontFamily: "Courier" }}>
              {level.example}
            </Text>
          </View>
        )}

        <View className="rounded-2xl border border-border bg-card p-4">
          <Text className="mb-3 font-semibold text-foreground">{level.question.q}</Text>
          <View className="gap-2">
            {level.question.options.map((o, i) => {
              const isAns = i === level.question.answer;
              const show = submitted;
              return (
                <Pressable
                  key={i}
                  disabled={submitted}
                  onPress={() => setSelected(i)}
                  className={cn(
                    "rounded-lg border p-3",
                    show && isAns
                      ? "border-primary bg-primary/20"
                      : show && selected === i && !isAns
                        ? "border-destructive bg-destructive/20"
                        : selected === i
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/40",
                  )}
                >
                  <Text className="text-foreground">{o}</Text>
                </Pressable>
              );
            })}
          </View>
          {!submitted ? (
            <Button className="mt-4 w-full" disabled={selected === null} onPress={() => setSubmitted(true)}>
              Sprawdź
            </Button>
          ) : (
            <Button className="mt-4 w-full" onPress={onComplete}>
              {selected === level.question.answer ? "Świetnie! Dalej" : "Spróbuj kolejny poziom"}
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function QuizView({
  index,
  questions,
  onBack,
  onDone,
}: {
  index: number;
  questions: Question[];
  onBack: () => void;
  onDone: (correct: number) => void;
}) {
  const { padding, maxWidth } = useScreenLayout();
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const q = questions[i];
  const last = i === questions.length - 1;

  const next = () => {
    const newAns = [...answers, selected!];
    setAnswers(newAns);
    setSelected(null);
    if (last) {
      const correct = newAns.reduce((acc, a, k) => {
        const qk = questions[k];
        if (!qk) return acc;
        return acc + (a === qk.answer ? 1 : 0);
      }, 0);
      onDone(correct);
    } else {
      setI(i + 1);
    }
  };

  if (!q) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
      >
        <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
          <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1">
            <ArrowLeft color="#a89fb5" size={16} />
            <Text className="text-sm text-muted-foreground">wstecz</Text>
          </Pressable>
          <View className="rounded-2xl border border-border bg-card p-4">
            <Text className="text-sm text-muted-foreground">Brak pytań do wyświetlenia.</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1">
          <ArrowLeft color="#a89fb5" size={16} />
          <Text className="text-sm text-muted-foreground">wstecz</Text>
        </Pressable>
        <Text className="mb-1 text-xs uppercase tracking-wider text-accent">Quiz {index + 1}</Text>
        <Text className="mb-4 text-xl font-bold text-foreground">
          Pytanie {i + 1} / {questions.length}
        </Text>
        <View className="rounded-2xl border border-border bg-card p-4">
          <Text className="mb-3 font-semibold text-foreground">{q.q}</Text>
          <View className="gap-2">
            {q.options.map((o, k) => (
              <Pressable
                key={k}
                onPress={() => setSelected(k)}
                className={cn(
                  "rounded-lg border p-3",
                  selected === k
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/40",
                )}
              >
                <Text className="text-foreground">{o}</Text>
              </Pressable>
            ))}
          </View>
          <Button className="mt-4 w-full" disabled={selected === null} onPress={next}>
            {last ? "Zakończ quiz" : "Dalej"}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
