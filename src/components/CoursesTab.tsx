import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isValidTrack, SkillSurvey } from "./SkillSurvey";
import { buildLevels, type Question } from "@/lib/cppCourse";
import { TRACKS } from "@/lib/cppCourse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Sparkles, BookOpen, GraduationCap, RotateCcw, ChevronRight, Brain } from "lucide-react";
import { toast } from "sonner";
import { CHAPTER_SIZE, RECAP_EVERY, isRecapAfter, isChapterExamAfter, chapterOf, addWeak, removeWeak, pickReview } from "@/lib/learning";

type View =
  | { kind: "list" }
  | { kind: "lesson"; n: number; reviewMode?: boolean }
  | { kind: "recap"; afterLesson: number }
  | { kind: "exam"; chapter: number };

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
    return total;
  })();
  const totalChapters = Math.ceil(total / CHAPTER_SIZE);
  const currentChapter = chapterOf(nextLevel);

  // --- continuous learning flow ---
  const completeLesson = async (n: number) => {
    if (!user) return;
    if (!completed.has(n)) {
      await supabase.from("level_progress").insert({ user_id: user.id, level_number: n });
    }
    await loadProgress();
  };

  const goAfterLesson = (n: number, reviewMode?: boolean) => {
    if (reviewMode) { setView({ kind: "list" }); return; }
    if (isChapterExamAfter(n)) setView({ kind: "exam", chapter: n / CHAPTER_SIZE });
    else if (isRecapAfter(n)) setView({ kind: "recap", afterLesson: n });
    else if (n < total) setView({ kind: "lesson", n: n + 1 });
    else { toast.success("Ukończyłeś cały tor! 🎉"); setView({ kind: "list" }); }
  };

  if (view.kind === "lesson") {
    const lvl = levels[view.n - 1];
    return (
      <LessonView
        level={lvl}
        totalLessons={total}
        onBack={() => setView({ kind: "list" })}
        onFinished={async (gotIt) => {
          if (user) {
            if (gotIt) removeWeak(user.id, lvl.n);
            else addWeak(user.id, lvl.n);
          }
          if (!view.reviewMode) await completeLesson(lvl.n);
          goAfterLesson(lvl.n, view.reviewMode);
        }}
        reviewMode={view.reviewMode}
      />
    );
  }

  if (view.kind === "recap") {
    const start = view.afterLesson - RECAP_EVERY;
    const questions = levels.slice(start, view.afterLesson).map(l => l.question);
    return (
      <QuizView
        title={`Powtórka • lekcje ${start + 1}–${view.afterLesson}`}
        subtitle="Krótki sprawdzian materiału z ostatnich lekcji"
        questions={questions}
        onBack={() => setView({ kind: "list" })}
        onDone={async (correct) => {
          if (user) {
            await supabase.from("quiz_attempts").insert({
              user_id: user.id, quiz_number: 10000 + view.afterLesson,
              correct, total: questions.length,
            });
          }
          await loadProgress();
          if (view.afterLesson < total) setView({ kind: "lesson", n: view.afterLesson + 1 });
          else setView({ kind: "list" });
        }}
      />
    );
  }

  if (view.kind === "exam") {
    const start = (view.chapter - 1) * CHAPTER_SIZE;
    const questions = levels.slice(start, start + CHAPTER_SIZE).map(l => l.question);
    return (
      <QuizView
        title={`Egzamin • Rozdział ${view.chapter}`}
        subtitle={`Lekcje ${start + 1}–${start + CHAPTER_SIZE}`}
        questions={questions}
        isExam
        onBack={() => setView({ kind: "list" })}
        onDone={async (correct) => {
          if (user) {
            await supabase.from("quiz_attempts").insert({
              user_id: user.id, quiz_number: view.chapter - 1,
              correct, total: questions.length,
            });
          }
          await loadProgress();
          const pct = Math.round((correct / questions.length) * 100);
          toast.success(`Egzamin zaliczony — ${pct}%`);
          const nextAfter = start + CHAPTER_SIZE + 1;
          if (nextAfter <= total) setView({ kind: "lesson", n: nextAfter });
          else setView({ kind: "list" });
        }}
      />
    );
  }

  // --- list / dashboard ---
  const reviewLesson = user ? pickReview(user.id) : null;

  return (
    <div className="px-5 py-6 pb-24">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-wider text-primary mb-1">Twój tor</div>
        <h2 className="text-xl font-bold">{trackInfo.label}</h2>
        <p className="text-sm text-muted-foreground mt-1">{trackInfo.desc}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Postęp</span>
          <span className="text-sm font-semibold">{doneCount} / {total}</span>
        </div>
        <Progress value={(doneCount / total) * 100} />
        <div className="text-xs text-muted-foreground mt-2">
          Rozdział {currentChapter} z {totalChapters} • lekcja {Math.min(nextLevel, total)}
        </div>
        <Button
          className="w-full mt-4"
          size="lg"
          onClick={() => setView({ kind: "lesson", n: nextLevel })}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {doneCount === 0 ? "Zacznij naukę" : "Kontynuuj naukę"}
        </Button>
      </div>

      {reviewLesson && (
        <button
          onClick={() => setView({ kind: "lesson", n: reviewLesson, reviewMode: true })}
          className="w-full mb-4 bg-accent/20 border border-accent/40 rounded-xl p-3 flex items-center gap-3 text-left hover:bg-accent/30 transition"
        >
          <Brain className="w-5 h-5 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Powtórka mentora</div>
            <div className="text-xs text-muted-foreground">Wróćmy do lekcji {reviewLesson} — pomożemy ci ją utrwalić.</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Ładowanie...</div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: totalChapters }).map((_, ci) => {
            const start = ci * CHAPTER_SIZE + 1;
            const end = Math.min(start + CHAPTER_SIZE - 1, total);
            const chapDone = Array.from({length: end - start + 1}).filter((_,k)=>completed.has(start+k)).length;
            const examDone = quizDone.has(ci);
            return (
              <div key={ci} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">Rozdział {ci + 1}</div>
                  <div className="text-xs text-muted-foreground">{chapDone}/{end - start + 1}</div>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {Array.from({length: end - start + 1}).map((_,k) => {
                    const n = start + k;
                    const done = completed.has(n);
                    return (
                      <button
                        key={n}
                        onClick={() => setView({ kind: "lesson", n, reviewMode: done })}
                        className={`aspect-square rounded-lg text-xs font-semibold flex items-center justify-center border transition ${
                          done ? "bg-primary/30 border-primary"
                          : n === nextLevel ? "bg-accent/40 border-accent animate-pulse"
                          : "bg-secondary/40 border-border hover:bg-secondary"
                        }`}
                        title={done ? "Ukończona — kliknij, by powtórzyć" : "Otwórz lekcję"}
                      >
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
                      </button>
                    );
                  })}
                </div>
                {chapDone === end - start + 1 && (
                  <button
                    onClick={() => setView({ kind: "exam", chapter: ci + 1 })}
                    className={`w-full p-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border ${examDone ? "bg-primary/15 border-primary/40" : "bg-accent/20 border-accent"}`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    {examDone ? "Egzamin zaliczony — powtórz" : "Egzamin rozdziału"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LessonView({ level, totalLessons, onBack, onFinished, reviewMode }: {
  level: ReturnType<typeof buildLevels>[number];
  totalLessons: number;
  onBack: () => void;
  onFinished: (gotIt: boolean) => void;
  reviewMode?: boolean;
}) {
  const [phase, setPhase] = useState<"learn" | "check" | "recap">("learn");
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => { setPhase("learn"); setSelected(null); setSubmitted(false); };
  useEffect(reset, [level.n]);

  const correct = selected === level.question.answer;

  return (
    <div className="px-5 py-6 pb-28 max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> wstecz
      </button>

      <div className="flex items-center gap-2 mb-1">
        <div className="text-xs text-primary uppercase tracking-wider">
          {reviewMode ? "Powtórka" : "Lekcja"} {level.n} / {totalLessons}
        </div>
        {reviewMode && <RotateCcw className="w-3 h-3 text-accent" />}
      </div>
      <h2 className="text-2xl font-bold mb-4">{level.title}</h2>

      {phase === "learn" && (
        <>
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 text-xs text-accent uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" /> Wyjaśnienie
            </div>
            <p className="text-[15px] leading-relaxed">{level.lesson}</p>
            {level.example && (
              <pre className="bg-background/60 border border-border rounded-lg p-3 text-xs overflow-x-auto mt-4">
                <code>{level.example}</code>
              </pre>
            )}
          </div>
          <Button size="lg" className="w-full" onClick={() => setPhase("check")}>
            Rozumiem — sprawdź mnie <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}

      {phase === "check" && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs text-accent uppercase tracking-wider mb-2">Sprawdź zrozumienie</div>
          <div className="font-semibold mb-3 text-[15px]">{level.question.q}</div>
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
                    show && isAns ? "border-primary bg-primary/25"
                    : show && selected === i && !isAns ? "border-destructive bg-destructive/20"
                    : selected === i ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/40"
                  }`}
                >{o}</button>
              );
            })}
          </div>
          {!submitted ? (
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setPhase("learn")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Wróć do lekcji
              </Button>
              <Button className="flex-1" disabled={selected === null} onClick={() => setSubmitted(true)}>
                Sprawdź
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <div className={`text-sm p-3 rounded-lg ${correct ? "bg-primary/15 text-foreground" : "bg-destructive/15"}`}>
                {correct ? "✓ Świetnie! Zrozumiałeś." : `Spróbuj jeszcze raz później. Poprawna odpowiedź: „${level.question.options[level.question.answer]}".`}
              </div>
              <Button variant="secondary" className="w-full" onClick={() => setPhase("recap")}>
                Zobacz krótkie podsumowanie
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === "recap" && (
        <>
          <div className="bg-accent/10 border border-accent/40 rounded-2xl p-5 mb-4">
            <div className="text-xs text-accent uppercase tracking-wider mb-2">Podsumowanie</div>
            <p className="text-sm leading-relaxed">{level.lesson}</p>
            <div className="mt-3 text-xs text-muted-foreground">
              Zapamiętaj: <b>{level.question.q}</b> → {level.question.options[level.question.answer]}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setSubmitted(false); setSelected(null); setPhase("check"); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> Powtórz pytanie
            </Button>
            <Button className="flex-1" size="lg" onClick={() => onFinished(correct)}>
              {reviewMode ? "Zakończ powtórkę" : "Kontynuuj naukę"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function QuizView({ title, subtitle, questions, onBack, onDone, isExam }: {
  title: string;
  subtitle: string;
  questions: Question[];
  onBack: () => void;
  onDone: (correct: number) => void;
  isExam?: boolean;
}) {
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<{ correct: number } | null>(null);

  const q = questions[i];
  const last = i === questions.length - 1;

  if (done) {
    const pct = Math.round((done.correct / questions.length) * 100);
    return (
      <div className="px-5 py-6 pb-24 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <div className="bg-card border border-border rounded-2xl p-6 text-center my-6">
          <div className="text-5xl font-extrabold text-primary mb-2">{pct}%</div>
          <div className="text-sm text-muted-foreground">{done.correct} / {questions.length} poprawnych odpowiedzi</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => { setI(0); setSelected(null); setAnswers([]); setSubmitted(false); setDone(null); }}>
            <RotateCcw className="w-4 h-4 mr-1" /> Powtórz
          </Button>
          <Button className="flex-1" onClick={() => onDone(done.correct)}>
            Dalej <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const next = () => {
    const newAns = [...answers, selected!];
    setAnswers(newAns);
    setSelected(null);
    setSubmitted(false);
    if (last) {
      const correct = newAns.reduce((acc, a, k) => acc + (a === questions[k].answer ? 1 : 0), 0);
      setDone({ correct });
    } else {
      setI(i + 1);
    }
  };

  return (
    <div className="px-5 py-6 pb-24 max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> wstecz
      </button>
      <div className="text-xs text-accent uppercase tracking-wider mb-1">
        {isExam ? "Egzamin" : "Powtórka"}
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <Progress value={((i) / questions.length) * 100} className="mb-4" />
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-xs text-muted-foreground mb-1">Pytanie {i + 1} / {questions.length}</div>
        <div className="font-semibold mb-3">{q.q}</div>
        <div className="space-y-2">
          {q.options.map((o, k) => {
            const isAns = k === q.answer;
            const show = submitted;
            return (
              <button
                key={k}
                disabled={submitted}
                onClick={() => setSelected(k)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  show && isAns ? "border-primary bg-primary/25"
                  : show && selected === k && !isAns ? "border-destructive bg-destructive/20"
                  : selected === k ? "border-primary bg-primary/10"
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
          <Button className="w-full mt-4" onClick={next}>
            {last ? "Zakończ" : "Dalej"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
