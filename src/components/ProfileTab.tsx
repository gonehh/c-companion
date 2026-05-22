import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { medalsEarned, TIER_COLOR, TIER_LABEL, TIER_ORDER, type MedalTier } from "@/lib/medals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Award, Lock } from "lucide-react";
import { TRACKS } from "@/lib/cppCourse";

// Kolorowe ikony dla każdego tieru
const TIER_ICON_COLOR: Record<MedalTier, string> = {
  bronze: "#f0c98a",
  silver: "#f4f6f9",
  gold: "#fde68a",
  diamond: "#d6f3ff",
  obsidian: "#c4a8ff",
};

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

  const earned = medalsEarned(levels);
  const earnedTiers = new Set(earned.map((m) => m.tier));
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
        <Stat label="Medale" value={`${earned.length} / ${TIER_ORDER.length}`} />
      </div>

      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" /> Medale
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Co 100 ukończonych poziomów otrzymujesz mocniejszy medal: Brąz → Srebro → Złoto → Diament → Obsydian.
      </p>

      <div className="grid grid-cols-5 gap-2">
        {TIER_ORDER.map((tier, idx) => {
          const unlocked = earnedTiers.has(tier);
          return (
            <button
              key={tier}
              onClick={() => unlocked && setOpen(tier)}
              className={`flex flex-col items-center gap-2 transition ${unlocked ? "" : "cursor-default"}`}
            >
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all ${
                    unlocked
                      ? "border-primary/60 shadow-[0_0_20px_-2px_rgba(168,140,255,0.6)]"
                      : "border-border opacity-30 grayscale"
                  }`}
                  style={{ background: TIER_COLOR[tier] }}
                >
                  <Award
                    className="w-7 h-7"
                    style={{ color: unlocked ? TIER_ICON_COLOR[tier] : "#666", filter: unlocked ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : "none" }}
                  />
                </div>
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-foreground/70" />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${unlocked ? "" : "text-muted-foreground"}`}>
                {TIER_LABEL[tier]}
              </span>
              <span className="text-[9px] text-muted-foreground -mt-1">{(idx + 1) * 100} lvl</span>
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent>
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Medal: {TIER_LABEL[open]}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <div
                  className="w-28 h-28 rounded-full border-4 border-primary/60 shadow-2xl flex items-center justify-center mb-4"
                  style={{ background: TIER_COLOR[open] }}
                >
                  <Award
                    className="w-14 h-14"
                    style={{ color: TIER_ICON_COLOR[open], filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" }}
                  />
                </div>
                <p className="text-center">
                  Wykonałeś <b>{earned.find(m => m.tier === open)?.earnedAtLevels}</b> poziomów!
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
