import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { medalsEarned, TIER_COLOR, TIER_LABEL, TIER_ORDER, type MedalTier } from "@/lib/medals";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Award, Trophy, Target, TrendingUp } from "lucide-react";
import { TRACKS } from "@/lib/cppCourse";

interface QA { correct: number; total: number; created_at: string; }

export function ProfileTab() {
  const { profile, signOut, user } = useAuth();
  const [levels, setLevels] = useState(0);
  const [attempts, setAttempts] = useState<QA[]>([]);
  const [open, setOpen] = useState<MedalTier | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: lp }, { data: qa }] = await Promise.all([
        supabase.from("level_progress").select("level_number").eq("user_id", user.id),
        supabase.from("quiz_attempts").select("correct,total,created_at").eq("user_id", user.id).order("created_at"),
      ]);
      setLevels(lp?.length ?? 0);
      setAttempts((qa ?? []) as QA[]);
    })();
  }, [user]);

  const avg = attempts.length
    ? Math.round((attempts.reduce((s, r) => s + r.correct / r.total, 0) / attempts.length) * 100)
    : 0;
  const medals = medalsEarned(levels);
  const medalSet = new Set(medals.map(m => m.tier));
  const trackLabel = TRACKS.find(t => t.id === profile?.skill_level)?.label ?? "—";

  // postęp do kolejnego medalu
  const nextTierIndex = medals.length; // 0..5
  const nextTier = TIER_ORDER[nextTierIndex];
  const baseLevels = nextTierIndex * 100;
  const intoNext = levels - baseLevels;
  const toNextPct = nextTier ? Math.min(100, (intoNext / 100) * 100) : 100;

  return (
    <div className="px-5 py-6 pb-24">
      <div className="bg-card border border-border rounded-2xl p-5 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/30 border border-primary flex items-center justify-center text-xl font-bold">
          {profile?.nick?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate">{profile?.nick}</div>
          <div className="text-xs text-muted-foreground truncate">Poziom: {trackLabel}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat icon={<Target className="w-4 h-4" />} label="Ukończone lekcje" value={String(levels)} />
        <Stat icon={<TrendingUp className="w-4 h-4" />} label="Średnia trafność" value={attempts.length ? `${avg}%` : "—"} />
        <Stat icon={<Award className="w-4 h-4" />} label="Quizy / egzaminy" value={String(attempts.length)} />
        <Stat icon={<Trophy className="w-4 h-4" />} label="Medale" value={String(medals.length)} />
      </div>

      {nextTier && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Następny medal: {TIER_LABEL[nextTier]}</div>
            <div className="text-xs text-muted-foreground">{intoNext} / 100</div>
          </div>
          <Progress value={toNextPct} />
          <div className="text-xs text-muted-foreground mt-2">Jeszcze {100 - intoNext} lekcji.</div>
        </div>
      )}

      <h3 className="font-bold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Wszystkie odznaki</h3>
      <div className="grid grid-cols-5 gap-2">
        {TIER_ORDER.map((tier, i) => {
          const earned = medalSet.has(tier);
          return (
            <button
              key={tier}
              onClick={() => earned && setOpen(tier)}
              disabled={!earned}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${earned ? "border-primary/40 bg-card hover:bg-secondary" : "border-border bg-card/50"}`}
            >
              <div
                className={`w-14 h-14 rounded-full border-2 ${earned ? "border-primary/40 shadow-lg" : "border-border grayscale opacity-40"} flex items-center justify-center`}
                style={{ background: TIER_COLOR[tier] }}
              >
                <Award className="w-6 h-6 text-foreground/70" />
              </div>
              <span className="text-[10px] font-semibold">{TIER_LABEL[tier]}</span>
              <span className="text-[9px] text-muted-foreground">{(i + 1) * 100}</span>
            </button>
          );
        })}
      </div>

      {attempts.length > 0 && (
        <>
          <h3 className="font-bold mt-6 mb-3 text-sm">Historia ostatnich quizów</h3>
          <div className="space-y-1.5">
            {attempts.slice(-6).reverse().map((a, i) => {
              const pct = Math.round((a.correct / a.total) * 100);
              return (
                <div key={i} className="bg-card border border-border rounded-lg p-2.5 flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pl-PL")}</span>
                  <span className="font-semibold">{a.correct}/{a.total}</span>
                  <span className={`text-xs font-bold ${pct >= 70 ? "text-primary" : "text-destructive"}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent>
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Medal: {TIER_LABEL[open]}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <div className="w-28 h-28 rounded-full border-4 border-primary/40 shadow-2xl flex items-center justify-center mb-4"
                  style={{ background: TIER_COLOR[open] }}>
                  <Award className="w-12 h-12 text-foreground/70" />
                </div>
                <div className="grid grid-cols-3 gap-3 w-full text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{levels}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Lekcje</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{attempts.length ? `${avg}%` : "—"}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Trafność</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{attempts.length}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Quizy</div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Zdobyty za {medals.find(m => m.tier === open)?.earnedAtLevels} ukończonych lekcji.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <div className="text-2xl font-bold text-primary">{value}</div>
    </div>
  );
}
