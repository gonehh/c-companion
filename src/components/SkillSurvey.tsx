import { TRACKS, type Track } from "@/lib/cppCourse";
import { useAuth } from "@/lib/auth";

export function SkillSurvey() {
  const { setSkillLevel } = useAuth();
  return (
    <div className="px-5 py-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-2">Na jakim poziomie jesteś?</h2>
      <p className="text-sm text-muted-foreground mb-6">Wybierz odpowiedź — dopasujemy poziom trudności.</p>
      <div className="space-y-3">
        {TRACKS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSkillLevel(t.id)}
            className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-secondary transition active:scale-[0.99]"
          >
            <div className="font-semibold">{t.label}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const isValidTrack = (s: string | null | undefined): s is Track =>
  s === "beginner" || s === "basic" || s === "intermediate" || s === "advanced";
