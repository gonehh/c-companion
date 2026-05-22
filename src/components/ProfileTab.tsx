import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { medalsEarned, TIER_COLOR, type MedalTier } from "@/lib/medals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Award } from "lucide-react";
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
  const trackLabel = TRACKS.find(t => t.id === profile?.skill_level)?.label ?? "—";

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

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Ukończone poziomy" value={String(levels)} />
        <Stat label="Średnia z quizów" value={stats.quizzes ? `${stats.avg}%` : "—"} />
        <Stat label="Rozwiązane quizy" value={String(stats.quizzes)} />
        <Stat label="Medale" value={String(medals.length)} />
      </div>

      <h3 className="font-bold mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Medale</h3>
      {medals.length === 0 ? (
        <div className="text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">
          Ukończ 100 poziomów aby zdobyć pierwszy medal (Brąz). Z każdą setką poziomów dostajesz mocniejszy materiał: Brąz → Srebro → Złoto → Diament → Obsydian.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {medals.map((m) => (
            <button key={m.tier} onClick={() => setOpen(m.tier)} className="flex flex-col items-center gap-2">
              <div
                className="w-20 h-20 rounded-full border-4 border-border shadow-lg flex items-center justify-center"
                style={{ background: TIER_COLOR[m.tier] }}
              >
                <Award className="w-8 h-8 text-foreground/70" />
              </div>
              <span className="text-xs font-semibold">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent>
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Medal: {medals.find(m => m.tier === open)?.label}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <div className="w-28 h-28 rounded-full border-4 border-border shadow-2xl flex items-center justify-center mb-4"
                  style={{ background: TIER_COLOR[open] }}>
                  <Award className="w-12 h-12 text-foreground/70" />
                </div>
                <p className="text-center">
                  Wykonałeś <b>{medals.find(m => m.tier === open)?.earnedAtLevels}</b> poziomów!
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
