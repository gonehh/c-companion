import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { isValidTrack, SkillSurvey } from "./SkillSurvey";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { useResponsive, useScreenLayout } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { getStagesForTrack, totalLessons, type RoadmapQuestion, type RoadmapStage, type RoadmapLesson } from "@/lib/roadmap";
import { useTheme } from "@/lib/theme";
import { TRACKS, type Track } from "@/lib/cppCourse";

type ViewState =
  | { kind: "roadmap" }
  | { kind: "lesson"; stageId: string; lessonId: string }
  | { kind: "stageQuiz"; stageId: string }
  | { kind: "exam"; examId: string; stageId: string };

function shuffleQuestions<T>(items: T[]) {
  const next = [...items];
  for (let idx = next.length - 1; idx > 0; idx -= 1) {
    const swapIdx = Math.floor(Math.random() * (idx + 1));
    [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
  }
  return next;
}

function shuffleQuestionOptions(question: RoadmapQuestion) {
  const options = question.options.map((label, index) => ({
    label,
    isAnswer: index === question.answer,
  }));
  return shuffleQuestions(options);
}

export function CoursesTab() {
  const { profile, user, addXp, progressVersion } = useAuth();
  const { theme } = useTheme();
  useResponsive();
  const { padding, maxWidth } = useScreenLayout();
  const [view, setView] = useState<ViewState>({ kind: "roadmap" });
  const [loading, setLoading] = useState(true);
  const [lessonDone, setLessonDone] = useState<Set<string>>(new Set());
  const [stageQuizDone, setStageQuizDone] = useState<Set<string>>(new Set());
  const [examDone, setExamDone] = useState<Set<string>>(new Set());

  const track: Track | null = isValidTrack(profile?.skill_level) ? (profile!.skill_level as Track) : null;

  const showDbError = (fallback: string, err: any) => {
    const codeRaw = typeof err?.code === "string" ? err.code.trim() : "";
    if (codeRaw === "PGRST205" || err?.status === 404) {
      toast.error("Brakuje tabel w Supabase (migracje nie są wgrane). Uruchom migrację bazy danych.");
      return;
    }
    const msg = typeof err?.message === "string" && err.message.trim().length ? err.message : fallback;
    const code = codeRaw.length ? ` (${codeRaw})` : "";
    toast.error(`${msg}${code}`);
  };

  const loadProgress = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: lp, error: lpErr }, { data: sq, error: sqErr }, { data: ex, error: exErr }] = await Promise.all([
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
      supabase.from("stage_quiz_attempts").select("stage_id,xp_gained").eq("user_id", user.id),
      supabase.from("exam_attempts").select("exam_id").eq("user_id", user.id),
    ]);

    if (lpErr) showDbError("Nie udało się wczytać postępu (lekcje)", lpErr);
    if (sqErr) showDbError("Nie udało się wczytać postępu (quizy)", sqErr);
    if (exErr) showDbError("Nie udało się wczytać postępu (egzaminy)", exErr);
    setLessonDone(new Set((lp ?? []).map((r: any) => r.lesson_id)));
    setStageQuizDone(new Set((sq ?? []).filter((r: any) => (r?.xp_gained ?? 0) > 0).map((r: any) => r.stage_id)));
    setExamDone(new Set((ex ?? []).map((r: any) => r.exam_id)));
    setLoading(false);
  };

  useEffect(() => {
    setLessonDone(new Set());
    setStageQuizDone(new Set());
    setExamDone(new Set());
    setLoading(true);
    setView({ kind: "roadmap" });
    loadProgress();
  }, [user, progressVersion]);

  if (!track) return <SkillSurvey />;

  const stages = getStagesForTrack(track);
  const visibleLessonsTotal = totalLessons(stages);
  const visibleLessonIds = new Set(stages.flatMap((stage) => stage.lessons.map((lesson) => lesson.id)));
  const visibleLessonsCompleted = [...lessonDone].filter((lessonId) => visibleLessonIds.has(lessonId)).length;
  const percent = visibleLessonsTotal ? (visibleLessonsCompleted / visibleLessonsTotal) * 100 : 0;
  const trackLabel = TRACKS.find((t) => t.id === track)?.label ?? track;

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
          const { error } = await supabase
            .from("lesson_progress")
            .upsert({ user_id: user.id, lesson_id: lesson.id }, { onConflict: "user_id,lesson_id" });
          if (error) {
            showDbError("Nie udało się zapisać postępu", error);
            return;
          }
          setLessonDone((prev) => {
            const next = new Set(prev);
            next.add(lesson.id);
            return next;
          });
          toast.success("Lekcja ukończona");
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
          const alreadyPassed = stageQuizDone.has(stage.id);
          const xp = passed && !alreadyPassed ? stage.quiz.xpOnPass : 0;
          const { error } = await supabase.from("stage_quiz_attempts").insert({
            user_id: user.id,
            stage_id: stage.id,
            correct,
            total,
            xp_gained: xp,
          });
          if (error) {
            showDbError("Nie udało się zapisać wyniku quizu", error);
            return;
          }
          if (xp) await addXp(xp);
          await loadProgress();
          toast.success(
            passed
              ? xp
                ? `Quiz zaliczony (+${xp} XP)`
                : `Quiz zaliczony: ${correct}/${total} (powtórka bez XP)`
              : `Quiz niezaliczony (${correct}/${total})`,
          );
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
          const alreadyCompleted = examDone.has(exam.id);
          const xp = alreadyCompleted ? 0 : correct * exam.xpPerCorrect;
          const { error } = await supabase.from("exam_attempts").insert({
            user_id: user.id,
            exam_id: exam.id,
            correct,
            total,
            xp_gained: xp,
          });
          if (error) {
            showDbError("Nie udało się zapisać wyniku egzaminu", error);
            return;
          }
          if (xp) await addXp(xp);
          await loadProgress();
          toast.success(xp ? `Egzamin ukończony: ${correct}/${total} (+${xp} XP)` : `Egzamin ukończony: ${correct}/${total} (powtórka bez XP)`);
          setView({ kind: "roadmap" });
        }}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.mutedForeground }}>
          MAPA ROZWOJU
        </Text>
        <Text className="mt-1 text-3xl font-bold" style={{ color: theme.colors.foreground }}>
          Twoja ścieżka
        </Text>
        <Text className="mt-2 text-sm" style={{ color: theme.colors.mutedForeground }}>
          Ukończono {visibleLessonsCompleted} / {visibleLessonsTotal} lekcji • dopasowane do: {trackLabel}
        </Text>
        <Text className="mt-1 text-xs" style={{ color: theme.colors.mutedForeground }}>
          Ta ścieżka ma 5 etapów, a kazdy etap zawiera 5 poziomow dopasowanych do wybranego poziomu.
        </Text>

        <View className="mt-4">
          <Progress value={percent} />
        </View>

        <View className="mt-8">
          {stages.map((stage, idx) => {
            const lessonIds = stage.lessons.map((l) => l.id);
            const doneCount = lessonIds.filter((id) => lessonDone.has(id)).length;
            const stageDone = doneCount === stage.lessons.length && stage.lessons.length > 0;
            const previousIncomplete = stages
              .slice(0, idx)
              .some((s) => (s.exam ? !examDone.has(s.exam.id) : !stageQuizDone.has(s.id)));
            const quizUnlocked = stageDone;
            const quizDone = stageQuizDone.has(stage.id);
            const examUnlocked = quizDone && !!stage.exam;
            const examDoneFlag = stage.exam ? examDone.has(stage.exam.id) : false;

            return (
              <View key={stage.id} className="mt-6">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-lg font-bold" style={{ color: theme.colors.foreground }}>
                    Etap {idx + 1} · {stage.title}
                  </Text>
                  <Text style={{ color: theme.colors.mutedForeground }}>
                    {doneCount}/{stage.lessons.length}
                  </Text>
                </View>
                {previousIncomplete && (
                  <Text className="mb-2 text-xs" style={{ color: theme.colors.mutedForeground }}>
                    Uwaga: masz nieukończone poprzednie etapy.
                  </Text>
                )}
                <View
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
                >
                  {stage.lessons.map((l, i) => {
                    const done = lessonDone.has(l.id);
                    const prevId = i > 0 ? stage.lessons[i - 1]!.id : null;
                    const unlocked = i === 0 || (prevId ? lessonDone.has(prevId) : true);
                    const code = `${idx + 1}.${i + 1}`;
                    return (
                      <Pressable
                        key={l.id}
                        disabled={!unlocked}
                        onPress={() => setView({ kind: "lesson", stageId: stage.id, lessonId: l.id })}
                        className={cn(
                          "flex-row items-center gap-3 px-4 py-4",
                          i !== stage.lessons.length - 1 && "border-b",
                          !unlocked && "opacity-60",
                        )}
                        style={i !== stage.lessons.length - 1 ? { borderBottomColor: theme.colors.border } : undefined}
                      >
                        <View
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          style={{
                            borderColor: theme.colors.border,
                            backgroundColor: done ? `${theme.colors.primary}33` : theme.colors.muted,
                          }}
                        >
                          {done ? (
                            <CheckCircle2 color={theme.colors.primary} size={16} />
                          ) : !unlocked ? (
                            <Lock color={theme.colors.mutedForeground} size={14} />
                          ) : (
                            <Text className="text-xs font-bold" style={{ color: theme.colors.mutedForeground }}>
                              {code}
                            </Text>
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
                      disabled={!quizUnlocked}
                      onPress={() => setView({ kind: "stageQuiz", stageId: stage.id })}
                    >
                      <Text className="text-sm font-semibold text-secondary-foreground">
                        {quizDone
                          ? "Mini quiz ukończony (powtórz)"
                          : quizUnlocked
                            ? `Mini quiz (+${stage.quiz.xpOnPass} XP)`
                            : "Ukończ etap, aby odblokować mini quiz"}
                      </Text>
                    </Button>
                    {stage.exam && (
                      <Button
                        className="mt-3"
                        disabled={!examUnlocked}
                        onPress={() => setView({ kind: "exam", stageId: stage.id, examId: stage.exam!.id })}
                      >
                        <Text className="text-sm font-semibold text-primary-foreground">
                          {examDoneFlag
                            ? "Egzamin ukończony (powtórz)"
                            : examUnlocked
                              ? `Egzamin (${stage.exam!.xpPerCorrect} XP za poprawną odpowiedź)`
                              : "Zalicz mini quiz, aby odblokować egzamin"}
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
            Ładowanie...
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
  const [step, setStep] = useState<"content" | "question">("content");
  const [questionVersion, setQuestionVersion] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | "correct" | "wrong">(null);
  const q = lesson.question;
  const shuffledOptions = useMemo(() => (q ? shuffleQuestionOptions(q) : []), [q, questionVersion]);
  const canComplete = done || !q || checked === "correct";
  const locked = checked !== null;
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
            wstecz
          </Text>
        </Pressable>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.mutedForeground }}>
          {stage.title}
        </Text>
        <Text className="mt-1 text-2xl font-bold" style={{ color: theme.colors.foreground }}>
          {lesson.title}
        </Text>
        {step === "content" ? (
          <>
            <View
              className="mt-4 rounded-2xl border p-4"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
            >
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

            {!!q ? (
              <Button
                className="mt-4"
                onPress={() => {
                  setSelected(null);
                  setChecked(null);
                  setQuestionVersion((prev) => prev + 1);
                  setStep("question");
                }}
              >
                {done ? "Pytanie kontrolne" : "Kontynuuj"}
              </Button>
            ) : (
              <Button className="mt-4" disabled={!canComplete || done} onPress={onComplete}>
                {done ? "Ukończone" : "Oznacz jako ukończone"}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              className="mt-4"
              variant="secondary"
              onPress={() => {
                setSelected(null);
                setChecked(null);
                setQuestionVersion((prev) => prev + 1);
                setStep("content");
              }}
            >
              Wróć do lekcji
            </Button>

            {!!q && (
              <View className="mt-4 rounded-2xl border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                <Text className="mb-3 font-semibold" style={{ color: theme.colors.foreground }}>
                  Pytanie kontrolne
                </Text>
                <Text className="mb-3 text-sm" style={{ color: theme.colors.foreground }}>
                  {q.q}
                </Text>
                <View className="gap-2">
                  {shuffledOptions.map((option, idx) => {
                    const isAns = option.isAnswer;
                    const show = checked !== null;
                    const selectedNow = selected === idx;
                    return (
                      <Pressable
                        key={idx}
                        disabled={locked}
                        onPress={() => setSelected(idx)}
                        className="rounded-lg border p-3"
                        style={{
                          borderColor:
                            show && isAns
                              ? theme.colors.primary
                              : show && selectedNow && !isAns
                                ? theme.colors.destructive
                                : selectedNow
                                  ? theme.colors.primary
                                  : theme.colors.border,
                          backgroundColor:
                            show && isAns
                              ? `${theme.colors.primary}26`
                              : show && selectedNow && !isAns
                                ? `${theme.colors.destructive}26`
                                : selectedNow
                                  ? `${theme.colors.primary}1A`
                                  : theme.colors.card,
                          opacity: locked && !selectedNow ? 0.7 : 1,
                        }}
                      >
                        <Text style={{ color: theme.colors.foreground }}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Button
                  className="mt-4 w-full"
                  disabled={selected === null || locked}
                  onPress={() => setChecked(selected !== null && shuffledOptions[selected]?.isAnswer ? "correct" : "wrong")}
                >
                  Sprawdź
                </Button>
                {checked !== null && (
                  <Text className="mt-3 text-xs" style={{ color: theme.colors.mutedForeground }}>
                    {checked === "correct"
                      ? done
                        ? "Poprawnie. Lekcja jest już ukończona."
                        : "Poprawnie. Możesz ukończyć lekcję."
                      : "Niepoprawnie. Zamknij pytanie i uruchom je ponownie."}
                  </Text>
                )}
                {checked === "wrong" && (
                  <Button
                    className="mt-3 w-full"
                    variant="secondary"
                    onPress={() => {
                      setSelected(null);
                      setChecked(null);
                      setQuestionVersion((prev) => prev + 1);
                      setStep("content");
                    }}
                  >
                    Zamknij pytanie
                  </Button>
                )}
              </View>
            )}

            <Button className="mt-4" disabled={!canComplete || done} onPress={onComplete}>
              {done ? "Ukończone" : "Oznacz jako ukończone"}
            </Button>
          </>
        )}
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
  const shuffledQuestions = useMemo(() => shuffleQuestions(questions), [questions]);
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const q = shuffledQuestions[i];
  const last = i === shuffledQuestions.length - 1;

  const next = () => {
    const newAns = [...answers, selected!];
    setAnswers(newAns);
    setSelected(null);
    if (last) {
      const correct = newAns.reduce((acc, a, k) => acc + (a === shuffledQuestions[k]?.answer ? 1 : 0), 0);
      const total = shuffledQuestions.length;
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
            wstecz
          </Text>
        </Pressable>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.accent }}>
          {title}
        </Text>
        <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.foreground }}>
          Pytanie {i + 1} / {shuffledQuestions.length}
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
            {last ? "Zakończ" : "Dalej"}
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
  const shuffledQuestions = useMemo(() => shuffleQuestions(questions), [questions]);
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const q = shuffledQuestions[i];
  const last = i === shuffledQuestions.length - 1;

  const next = () => {
    const newAns = [...answers, selected!];
    setAnswers(newAns);
    setSelected(null);
    if (last) {
      const correct = newAns.reduce((acc, a, k) => acc + (a === shuffledQuestions[k]?.answer ? 1 : 0), 0);
      onDone({ correct, total: shuffledQuestions.length });
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
            wstecz
          </Text>
        </Pressable>
        <Text className="text-xs uppercase tracking-wider" style={{ color: theme.colors.primary }}>
          {title}
        </Text>
        <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.foreground }}>
          Pytanie {i + 1} / {shuffledQuestions.length} · {xpPerCorrect} XP za poprawną odpowiedź
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
            {last ? "Zakończ egzamin" : "Dalej"}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
