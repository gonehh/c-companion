import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isValidTrack, SkillSurvey } from "./SkillSurvey";
import { buildLevels, buildQuiz, buildFinalExam, TRACKS } from "@/lib/cppCourse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Lock, Sparkles, BookOpen, Lightbulb, GraduationCap, Trophy } from "lucide-react";
import { toast } from "sonner";

type View =
  | { kind: "list" }
  | { kind: "level"; n: number }
  | { kind: "quiz"; index: number }
  | { kind: "final" };

// quiz_number używamy tak: 0..9 = quizy po 10 poziomach, 99 = egzamin końcowy
const FINAL_EXAM_ID = 99;

export function CoursesTab() {
  const { profile, user } = useAuth();
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [quizDone, setQuizDone] = useState<Set<number>>(new Set());
  const [view, setView] = useState<View>({ kind: "list" });
  const [loading, setLoading] = useState(true);

  const track = isValidTrack(profile?.skill_level) ? profile!.skill_level : null;
  const levels = useMemo(() => (track ? buildLevels(track as any) : []), [track]);

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

  useEffect(() => { loadProgress(); }, [user]);

  if (!track) return <SkillSurvey />;

  const trackInfo = TRACKS.find(t => t.id === track)!;
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

  const needsQuizAfter = (n: number) => n % 10 === 0 && completed.has(n) && !quizDone.has(n / 10 - 1);

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
    const qs = buildQuiz(track as any, view.index);
    return (
      <QuizView
        title={`Quiz ${view.index + 1} — poziomy ${view.index * 10 + 1}–${(view.index + 1) * 10}`}
        questions={qs}
        onBack={() => setView({ kind: "list" })}
        onDone={async (correct) => {
          if (!user) return;
          await supabase.from("quiz_attempts").insert({
            user_id: user.id, quiz_number: view.index, correct, total: qs.length,
          });
          await loadProgress();
          toast.success(`Quiz zaliczony! ${correct}/${qs.length}`);
          setView({ kind: "list" });
        }}
      />
    );
  }

  if (view.kind === "final") {
    const qs = buildFinalExam(track as any);
    return (
      <QuizView
        title="Egzamin końcowy — cały kurs C++"
        questions={qs}
        accent="primary"
        onBack={() => setView({ kind: "list" })}
        onDone={async (correct) => {
          if (!user) return;
          await supabase.from("quiz_attempts").insert({
            user_id: user.id, quiz_number: FINAL_EXAM_ID, correct, total: qs.length,
          });
          await loadProgress();
          toast.success(`Egzamin zakończony! Wynik: ${correct}/${qs.length}`);
          setView({ kind: "list" });
        }}
      />
    );
  }

  const allLevelsDone = doneCount === total;
  const finalDone = quizDone.has(FINAL_EXAM_ID);

  return (
    <div className="px-5 py-6 pb-24">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-wider text-primary mb-1">Twój tor</div>
        <h2 className="text-xl font-bold">{trackInfo.label}</h2>
        <p className="text-sm text-muted-foreground mt-1">{trackInfo.desc}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Postęp</span>
          <span className="text-sm font-semibold">{doneCount} / {total}</span>
        </div>
        <Progress value={(doneCount / total) * 100} />
        {nextLevel && (
          <Button
            className="w-full mt-4"
            onClick={() => setView({ kind: "level", n: nextLevel })}
            disabled={!isUnlocked(nextLevel)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {needsQuizAfter(nextLevel - 1)
              ? "Najpierw quiz!"
              : `Kontynuuj — Poziom ${nextLevel}`}
          </Button>
        )}
      </div>

      {/* Egzamin końcowy */}
      {allLevelsDone && (
        <button
          onClick={() => setView({ kind: "final" })}
          className={`w-full mb-5 p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition ${
            finalDone
              ? "bg-primary/20 border-primary"
              : "bg-gradient-to-r from-primary/30 to-accent/30 border-primary animate-pulse"
          }`}
        >
          <Trophy className="w-7 h-7 text-primary shrink-0" />
          <div className="flex-1">
            <div className="font-bold">Egzamin końcowy</div>
            <div className="text-xs text-muted-foreground">
              {finalDone ? "Zaliczony — możesz powtórzyć" : "Odblokowany! 20 pytań z całego kursu"}
            </div>
          </div>
        </button>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Ładowanie...</div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {levels.map((lvl) => {
            const done = completed.has(lvl.n);
            const unlocked = isUnlocked(lvl.n);
            const isQuizGate = lvl.n % 10 === 0;
            return (
              <button
                key={lvl.n}
                disabled={!unlocked}
                onClick={() => setView({ kind: "level", n: lvl.n })}
                className={`aspect-square rounded-xl text-sm font-semibold flex flex-col items-center justify-center border transition ${
                  done
                    ? "bg-primary/30 border-primary text-foreground"
                    : unlocked
                    ? "bg-card border-border hover:bg-secondary"
                    : "bg-muted/50 border-border text-muted-foreground opacity-50"
                } ${isQuizGate ? "ring-1 ring-accent/60" : ""}`}
              >
                {done ? <CheckCircle2 className="w-4 h-4 mb-0.5" /> : !unlocked ? <Lock className="w-3 h-3 mb-0.5" /> : null}
                {lvl.n}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => {
          const blockStart = i * 10 + 1;
          const blockEnd = (i + 1) * 10;
          const ready = Array.from({ length: 10 }).every((_, k) => completed.has(blockStart + k));
          const done = quizDone.has(i);
          if (!ready) return null;
          return (
            <button
              key={i}
              onClick={() => setView({ kind: "quiz", index: i })}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between ${
                done ? "bg-primary/20 border-primary/50" : "bg-accent/30 border-accent"
              }`}
            >
              <span className="font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Quiz {i + 1} — poziomy {blockStart}–{blockEnd}
              </span>
              <span className="text-xs text-muted-foreground">{done ? "Zaliczony" : "5 pytań"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LevelView({ level, onBack, onComplete }: { level: ReturnType<typeof buildLevels>[number]; onBack: () => void; onComplete: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);

  return (
    <div className="px-5 py-6 pb-24 max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> wstecz
      </button>
      <div className="text-xs text-primary uppercase tracking-wider mb-1">Poziom {level.n}</div>
      <h2 className="text-2xl font-bold mb-4">{level.title}</h2>

      {/* Sekcja: NAUKA */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-wider mb-2 font-semibold">
          <BookOpen className="w-4 h-4" /> Nauka
        </div>
        <p className="text-base leading-relaxed mb-3">{level.lesson}</p>
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{level.details}</div>
      </div>

      {level.example && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-3">
          <div className="text-xs uppercase tracking-wider text-accent mb-2 font-semibold">Przykład kodu</div>
          <pre className="bg-muted/60 border border-border rounded-lg p-3 text-xs overflow-x-auto"><code>{level.example}</code></pre>
        </div>
      )}

      {level.tip && (
        <div className="bg-accent/15 border border-accent/40 rounded-2xl p-4 mb-4 flex gap-2">
          <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{level.tip}</p>
        </div>
      )}

      {!showQuestion ? (
        <Button className="w-full" onClick={() => setShowQuestion(true)}>
          Rozumiem — przejdź do pytania
        </Button>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-primary mb-2 font-semibold">Sprawdź wiedzę</div>
          <div className="font-semibold mb-3">{level.question.q}</div>
          <div className="space-y-2">
            {level.question.options.map((o, i) => {
              const isAns = i === level.question.answer;
              const show = submitted;
              return (
                <button
                  key={i}
                  disabled={submitted}
                  onClick={() => setSelected(i)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    show && isAns ? "border-primary bg-primary/20"
                    : show && selected === i && !isAns ? "border-destructive bg-destructive/20"
                    : selected === i ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/40"
                  }`}
                >{o}</button>
              );
            })}
          </div>
          {!submitted ? (
            <Button className="w-full mt-4" disabled={selected === null} onClick={() => setSubmitted(true)}>
              Sprawdź
            </Button>
          ) : (
            <Button className="w-full mt-4" onClick={onComplete}>
              {selected === level.question.answer ? "Świetnie! Dalej" : "Spróbuj kolejny poziom"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function QuizView({ title, questions, onBack, onDone, accent = "accent" }: {
  title: string;
  questions: { q: string; options: string[]; answer: number }[];
  onBack: () => void;
  onDone: (correct: number) => void;
  accent?: "accent" | "primary";
}) {
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
      const correct = newAns.reduce((acc, a, k) => acc + (a === questions[k].answer ? 1 : 0), 0);
      onDone(correct);
    } else {
      setI(i + 1);
    }
  };

  return (
    <div className="px-5 py-6 pb-24 max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> wstecz
      </button>
      <div className={`text-xs uppercase tracking-wider mb-1 ${accent === "primary" ? "text-primary" : "text-accent"}`}>{title}</div>
      <h2 className="text-xl font-bold mb-4">Pytanie {i + 1} / {questions.length}</h2>
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="font-semibold mb-3">{q.q}</div>
        <div className="space-y-2">
          {q.options.map((o, k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`w-full text-left p-3 rounded-lg border ${selected === k ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
            >{o}</button>
          ))}
        </div>
        <Button className="w-full mt-4" disabled={selected === null} onClick={next}>
          {last ? "Zakończ" : "Dalej"}
        </Button>
      </div>
    </div>
  );
}
