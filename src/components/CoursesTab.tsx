import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { ArrowLeft, CheckCircle2, Lock, Sparkles, Trophy } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { isValidTrack, SkillSurvey } from "./SkillSurvey";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { useResponsive, useScreenLayout } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { ROADMAP, totalLessons, type RoadmapQuestion, type RoadmapStage, type RoadmapLesson } from "@/lib/roadmap";
import { useTheme } from "@/lib/theme";
import type { Track } from "@/lib/cppCourse";

type ViewState =
  | { kind: "roadmap" }
  | { kind: "lesson"; stageId: string; lessonId: string }
  | { kind: "stageQuiz"; stageId: string }
  | { kind: "exam"; examId: string; stageId: string };

export function CoursesTab() {
  const { profile, user, addXp } = useAuth();
  const { theme } = useTheme();
  const { breakpoint } = useResponsive();
  const { padding, maxWidth } = useScreenLayout();
  const [view, setView] = useState<ViewState>({ kind: "roadmap" });
  const [loading, setLoading] = useState(true);
  const [lessonDone, setLessonDone] = useState<Set<string>>(new Set());
  const [stageQuizDone, setStageQuizDone] = useState<Set<string>>(new Set());
  const [examDone, setExamDone] = useState<Set<string>>(new Set());

  const track: Track | null = isValidTrack(profile?.skill_level) ? (profile!.skill_level as Track) : null;

  const loadProgress = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: lp }, { data: sq }, { data: ex }] = await Promise.all([
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
      supabase.from("stage_quiz_attempts").select("stage_id,xp_gained").eq("user_id", user.id),
      supabase.from("exam_attempts").select("exam_id,xp_gained").eq("user_id", user.id),
    ]);

    setLessonDone(new Set((lp ?? []).map((r: any) => r.lesson_id)));
    setStageQuizDone(new Set((sq ?? []).filter((r: any) => (r?.xp_gained ?? 0) > 0).map((r: any) => r.stage_id)));
    setExamDone(new Set((ex ?? []).filter((r: any) => (r?.xp_gained ?? 0) > 0).map((r: any) => r.exam_id)));
    setLoading(false);
  };

  useEffect(() => {
    loadProgress();
  }, [user]);

  if (!track) return <SkillSurvey />;

  const stages = ROADMAP;
  const lessonsTotal = totalLessons();
  const lessonsCompleted = lessonDone.size;
  const percent = lessonsTotal ? (lessonsCompleted / lessonsTotal) * 100 : 0;
  const stageCols = breakpoint === "sm" ? 1 : 1;

  const findStage = (id: string) => stages.find((s) => s.id === id) ?? null;
  const findLesson = (stage: RoadmapStage, lessonId: string) => stage.lessons.find((l) => l.id === lessonId) ?? null;

  if (view.kind === "lesson") {
    const stage = findStage(view.stageId);
    if (!stage) return null;
    const lesson = findLesson(stage, view.lessonId);
    if (!lesson) return null;
    return (
      <LessonView
        theme={theme}
        stage={stage}
        lesson={lesson}
        done={lessonDone.has(lesson.id)}
        onBack={() => setView({ kind: "roadmap" })}
        onComplete={async () => {
          if (!user) return;
          await supabase.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lesson.id }, { onConflict: "user_id,lesson_id" });
          toast.success("Lesson completed");
          await loadProgress();
          setView({ kind: "roadmap" });
        }}
      />
    );
  }

  if (view.kind === "stageQuiz") {
    const stage = findStage(view.stageId);
    if (!stage) return null;
    return (
      <MiniQuizView
        theme={theme}
        title={stage.quiz.title}
        questions={stage.quiz.questions}
        onBack={() => setView({ kind: "roadmap" })}
        onDone={async ({ correct, total, passed }) => {
          if (!user) return;
          const xp = passed ? stage.quiz.xpOnPass : 0;
          await supabase.from("stage_quiz_attempts").insert({
            user_id: user.id,
            stage_id: stage.id,
            correct,
            total,
            xp_gained: xp,
          });
          if (xp) await addXp(xp);
          await loadProgress();
          toast.success(passed ? `Quiz passed (+${xp} XP)` : `Quiz failed (${correct}/${total})`);
          setView({ kind: "roadmap" });
        }}
      />
    );
  }

  if (view.kind === "exam") {
    const stage = findStage(view.stageId);
    if (!stage?.exam) return null;
    const exam = stage.exam;
    return (
      <ExamView
        theme={theme}
        title={exam.title}
        questions={exam.questions}
        xpPerCorrect={exam.xpPerCorrect}
        onBack={() => setView({ kind: "roadmap" })}
        onDone={async ({ correct, total }) => {
          if (!user) return;
          const xp = correct * exam.xpPerCorrect;
          await supabase.from("exam_attempts").insert({
            user_id: user.id,
            exam_id: exam.id,
            correct,
            total,
            xp_gained: xp,
          });
          if (xp) await addXp(xp);
          await loadProgress();
          toast.success(`Exam done: ${correct}/${total} (+${xp} XP)`);
          setView({ kind: "roadmap" });
        }}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.mutedForeground }}>
          C++ ROADMAP
        </Text>
        <Text className="mt-1 text-3xl font-bold" style={{ color: theme.colors.foreground }}>
          Your path
        </Text>
        <Text className="mt-2 text-sm" style={{ color: theme.colors.mutedForeground }}>
          {lessonsCompleted} / {lessonsTotal} lessons complete · adapted to {track} level
        </Text>

        <View className="mt-4">
          <Progress value={percent} />
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-lg font-bold" style={{ color: theme.colors.foreground }}>
            Achievements
          </Text>
        </View>

        <View className="mt-3 flex-row gap-3">
          {[
            { label: "BRONZE", stage: 10, key: "bronze", color: "#b87333" },
            { label: "SILVER", stage: 30, key: "silver", color: "#9aa0a6" },
            { label: "GOLD", stage: 50, key: "gold", color: "#c9a227" },
            { label: "DIAMOND", stage: 80, key: "diamond", color: "#7bd3f7" },
            { label: "OBSIDIAN", stage: 100, key: "obsidian", color: "#1a1a1f" },
          ].map((a) => {
            const unlocked = lessonsCompleted >= a.stage;
            return (
              <View key={a.key} className="flex-1">
                <View
                  className="items-center rounded-2xl border py-3"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 3,
                      borderColor: theme.colors.border,
                      backgroundColor: unlocked ? a.color : theme.colors.muted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trophy
                      color={unlocked ? "rgba(15,10,20,0.7)" : theme.colors.mutedForeground}
                      size={20}
                    />
                  </View>
                  <Text className="mt-2 text-xs font-semibold" style={{ color: theme.colors.foreground }}>
                    {a.label}
                  </Text>
                  <Text className="text-[10px]" style={{ color: theme.colors.mutedForeground }}>
                    {a.stage} lvls
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mt-8" style={stageCols ? undefined : undefined}>
          {stages.map((stage, idx) => {
            const lessonIds = stage.lessons.map((l) => l.id);
            const doneCount = lessonIds.filter((id) => lessonDone.has(id)).length;
            const stageDone = doneCount === stage.lessons.length && stage.lessons.length > 0;
            const quizUnlocked = stageDone;
            const quizDone = stageQuizDone.has(stage.id);
            const examUnlocked = quizDone && !!stage.exam;
            const examDoneFlag = stage.exam ? examDone.has(stage.exam.id) : false;

            return (
              <View key={stage.id} className="mt-6">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-lg font-bold" style={{ color: theme.colors.foreground }}>
                    Stage {idx + 1} · {stage.title}
                  </Text>
                  <Text style={{ color: theme.colors.mutedForeground }}>
                    {doneCount}/{stage.lessons.length}
                  </Text>
                </View>
                <View
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
                >
                  {stage.lessons.map((l, i) => {
                    const done = lessonDone.has(l.id);
                    return (
                      <Pressable
                        key={l.id}
                        onPress={() => setView({ kind: "lesson", stageId: stage.id, lessonId: l.id })}
                        className={cn(
                          "flex-row items-center gap-3 px-4 py-4",
                          i !== stage.lessons.length - 1 && "border-b",
                        )}
                        style={i !== stage.lessons.length - 1 ? { borderBottomColor: theme.colors.border } : undefined}
                      >
                        <View
                          className="h-8 w-8 items-center justify-center rounded-full border"
                          style={{
                            borderColor: theme.colors.border,
                            backgroundColor: done ? `${theme.colors.primary}33` : theme.colors.muted,
                          }}
                        >
                          {done ? (
                            <CheckCircle2 color={theme.colors.primary} size={16} />
                          ) : (
                            <Lock color={theme.colors.mutedForeground} size={14} />
                          )}
                        </View>
                        <Text className="flex-1 font-semibold" style={{ color: theme.colors.foreground }}>
                          {l.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <View className="px-4 pb-4 pt-2">
                    <Button
                      variant="secondary"
                      disabled={!quizUnlocked || quizDone}
                      onPress={() => setView({ kind: "stageQuiz", stageId: stage.id })}
                    >
                      <Text className="text-sm font-semibold text-secondary-foreground">
                        {quizDone ? "Mini quiz completed" : quizUnlocked ? `Mini quiz (+${stage.quiz.xpOnPass} XP)` : "Complete stage to unlock quiz"}
                      </Text>
                    </Button>
                    {stage.exam && (
                      <Button
                        className="mt-3"
                        disabled={!examUnlocked || examDoneFlag}
                        onPress={() => setView({ kind: "exam", stageId: stage.id, examId: stage.exam!.id })}
                      >
                        <Text className="text-sm font-semibold text-primary-foreground">
                          {examDoneFlag ? "Exam completed" : examUnlocked ? `Exam (10 XP / correct)` : "Pass mini quiz to unlock exam"}
                        </Text>
                      </Button>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {loading && (
          <Text className="py-10 text-center" style={{ color: theme.colors.mutedForeground }}>
            Loading...
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function LessonView({
  theme,
  stage,
  lesson,
  done,
  onBack,
  onComplete,
}: {
  theme: { colors: any };
  stage: RoadmapStage;
  lesson: RoadmapLesson;
  done: boolean;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { padding, maxWidth } = useScreenLayout();
  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1">
          <ArrowLeft color={theme.colors.mutedForeground} size={16} />
          <Text className="text-sm" style={{ color: theme.colors.mutedForeground }}>
            back
          </Text>
        </Pressable>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.mutedForeground }}>
          {stage.title}
        </Text>
        <Text className="mt-1 text-2xl font-bold" style={{ color: theme.colors.foreground }}>
          {lesson.title}
        </Text>
        <View className="mt-4 rounded-2xl border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
          <Text className="text-sm leading-relaxed" style={{ color: theme.colors.foreground }}>
            {lesson.body}
          </Text>
          {!!lesson.example && (
            <View className="mt-4 rounded-lg border p-3" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.muted }}>
              <Text style={{ color: theme.colors.foreground, fontFamily: "Courier", fontSize: 12 }}>
                {lesson.example}
              </Text>
            </View>
          )}
        </View>
        <Button className="mt-4" disabled={done} onPress={onComplete}>
          {done ? "Completed" : "Mark as learned"}
        </Button>
      </View>
    </ScrollView>
  );
}

function MiniQuizView({
  theme,
  title,
  questions,
  onBack,
  onDone,
}: {
  theme: { colors: any };
  title: string;
  questions: RoadmapQuestion[];
  onBack: () => void;
  onDone: (res: { correct: number; total: number; passed: boolean }) => void;
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
      const correct = newAns.reduce((acc, a, k) => acc + (a === questions[k]?.answer ? 1 : 0), 0);
      const total = questions.length;
      const passed = correct >= Math.ceil(total * 0.7);
      onDone({ correct, total, passed });
    } else {
      setI(i + 1);
    }
  };

  if (!q) return null;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1">
          <ArrowLeft color={theme.colors.mutedForeground} size={16} />
          <Text className="text-sm" style={{ color: theme.colors.mutedForeground }}>
            back
          </Text>
        </Pressable>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.accent }}>
          {title}
        </Text>
        <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.foreground }}>
          Question {i + 1} / {questions.length}
        </Text>
        <View className="mt-4 rounded-2xl border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
          <Text className="mb-3 font-semibold" style={{ color: theme.colors.foreground }}>
            {q.q}
          </Text>
          <View className="gap-2">
            {q.options.map((o, k) => (
              <Pressable
                key={k}
                onPress={() => setSelected(k)}
                className="rounded-lg border p-3"
                style={{
                  borderColor: selected === k ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selected === k ? `${theme.colors.primary}1A` : theme.colors.muted,
                }}
              >
                <Text style={{ color: theme.colors.foreground }}>{o}</Text>
              </Pressable>
            ))}
          </View>
          <Button className="mt-4 w-full" disabled={selected === null} onPress={next}>
            {last ? "Finish" : "Next"}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

function ExamView({
  theme,
  title,
  questions,
  xpPerCorrect,
  onBack,
  onDone,
}: {
  theme: { colors: any };
  title: string;
  questions: RoadmapQuestion[];
  xpPerCorrect: number;
  onBack: () => void;
  onDone: (res: { correct: number; total: number }) => void;
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
      const correct = newAns.reduce((acc, a, k) => acc + (a === questions[k]?.answer ? 1 : 0), 0);
      onDone({ correct, total: questions.length });
    } else {
      setI(i + 1);
    }
  };

  if (!q) return null;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Pressable onPress={onBack} className="mb-4 flex-row items-center gap-1">
          <ArrowLeft color={theme.colors.mutedForeground} size={16} />
          <Text className="text-sm" style={{ color: theme.colors.mutedForeground }}>
            back
          </Text>
        </Pressable>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.primary }}>
          {title}
        </Text>
        <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.foreground }}>
          Question {i + 1} / {questions.length} · {xpPerCorrect} XP per correct
        </Text>
        <View className="mt-4 rounded-2xl border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
          <Text className="mb-3 font-semibold" style={{ color: theme.colors.foreground }}>
            {q.q}
          </Text>
          <View className="gap-2">
            {q.options.map((o, k) => (
              <Pressable
                key={k}
                onPress={() => setSelected(k)}
                className="rounded-lg border p-3"
                style={{
                  borderColor: selected === k ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selected === k ? `${theme.colors.primary}1A` : theme.colors.muted,
                }}
              >
                <Text style={{ color: theme.colors.foreground }}>{o}</Text>
              </Pressable>
            ))}
          </View>
          <Button className="mt-4 w-full" disabled={selected === null} onPress={next}>
            {last ? "Finish exam" : "Next"}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
