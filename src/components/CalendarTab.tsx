import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Trash2, Bell } from "lucide-react";
import { toast } from "sonner";

interface Event { id: string; event_date: string; event_time: string; content: string; }

const PL_DAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const PL_MONTHS = ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];

export function CalendarTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openAi, setOpenAi] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("study_events").select("*").eq("user_id", user.id).order("event_date").order("event_time");
    setEvents((data ?? []) as Event[]);
  };
  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
    const sent = new Set<string>();
    const t = setInterval(() => {
      const now = new Date();
      events.forEach(e => {
        const dt = new Date(`${e.event_date}T${e.event_time}`);
        const diff = dt.getTime() - now.getTime();
        if (diff <= 0 && diff > -60_000 && !sent.has(e.id)) {
          sent.add(e.id);
          if (Notification.permission === "granted") {
            new Notification("C++ Quest — czas nauki!", { body: e.content });
          }
          toast.info(`Czas nauki: ${e.content}`);
        }
      });
    }, 30_000);
    return () => clearInterval(t);
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [startWeekday, daysInMonth]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, Event[]>();
    events.forEach(e => {
      const k = e.event_date;
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return m;
  }, [events]);

  const dateKey = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayKey = (() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`; })();

  return (
    <div className="px-5 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft className="w-5 h-5" /></button>
        <div className="font-bold text-lg capitalize">{PL_MONTHS[month]} {year}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <p className="text-xs text-muted-foreground mb-2 text-center">Kliknij dzień, aby dodać przypomnienie</p>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {PL_DAYS.map(d => <div key={d} className="text-xs text-muted-foreground text-center py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-5">
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dateKey(d);
          const dayEvents = eventsByDate.get(k) ?? [];
          const has = dayEvents.length > 0;
          const isToday = k === todayKey;
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(k)}
              className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center transition active:scale-95 ${
                isToday ? "border-primary bg-primary/15"
                : has ? "border-accent/60 bg-accent/10 hover:bg-accent/20"
                : "border-border bg-card hover:bg-secondary"
              }`}
            >
              <span className="font-semibold">{d}</span>
              {has && (
                <span className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((_, j) => (
                    <span key={j} className="w-1.5 h-1.5 rounded-full bg-accent" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={openAi} onOpenChange={setOpenAi}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="w-full mb-5">
            <Sparkles className="w-4 h-4 mr-1" /> Pomocnik AI — zaplanuj naukę
          </Button>
        </DialogTrigger>
        <AiPlannerDialog onPlanned={() => { setOpenAi(false); load(); }} />
      </Dialog>

      <h3 className="font-bold mb-2">Nadchodzące przypomnienia</h3>
      <div className="space-y-2">
        {events.length === 0 && (
          <div className="text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">
            Brak zaplanowanej nauki. Kliknij w dzień powyżej, aby dodać termin.
          </div>
        )}
        {events.map(e => (
          <div key={e.id} className="flex items-start gap-3 bg-card border border-border rounded-xl p-3">
            <Bell className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{formatDate(e.event_date)} • {e.event_time.slice(0,5)}</div>
              <div className="text-sm text-muted-foreground">{e.content}</div>
            </div>
            <button onClick={async () => { await supabase.from("study_events").delete().eq("id", e.id); load(); }}
              className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {/* Dialog dla wybranego dnia */}
      <Dialog open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)}>
        {selectedDate && (
          <DayDialog
            date={selectedDate}
            events={eventsByDate.get(selectedDate) ?? []}
            onChanged={load}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return `${String(day).padStart(2,"0")}.${String(m).padStart(2,"0")}.${y}`;
}

function DayDialog({ date, events, onChanged, onClose }: { date: string; events: Event[]; onChanged: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const [time, setTime] = useState("18:00");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user || !content.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("study_events").insert({
      user_id: user.id, event_date: date, event_time: time, content: content.trim(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Dodano przypomnienie");
      setContent("");
      onChanged();
    }
  };

  const remove = async (id: string) => {
    await supabase.from("study_events").delete().eq("id", id);
    toast.success("Usunięto");
    onChanged();
  };

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{formatDate(date)}</DialogTitle>
      </DialogHeader>

      {events.length > 0 && (
        <div className="space-y-2 mb-2">
          <div className="text-xs font-semibold text-muted-foreground">Zaplanowane:</div>
          {events.map(e => (
            <div key={e.id} className="flex items-start gap-2 bg-secondary/40 border border-border rounded-lg p-2">
              <Bell className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{e.event_time.slice(0,5)}</div>
                <div className="text-xs text-muted-foreground">{e.content}</div>
              </div>
              <button onClick={() => remove(e.id)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 pt-2 border-t border-border">
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Plus className="w-3 h-3" /> Dodaj nowe przypomnienie
        </div>
        <div><Label>Godzina</Label><Input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        <div><Label>Treść</Label><Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Np. powtórka pętli for" /></div>
        <Button className="w-full" onClick={save} disabled={busy || !content.trim()}>Zapisz</Button>
      </div>
    </DialogContent>
  );
}

function AiPlannerDialog({ onPlanned }: { onPlanned: () => void }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("Chcę uczyć się 30 minut dziennie, wieczorem w dni powszednie przez najbliższy tydzień.");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [proposals, setProposals] = useState<{ date: string; time: string; content: string }[]>([]);

  const ask = async () => {
    setBusy(true); setReply(""); setProposals([]);
    try {
      const resp = await fetch("/api/public/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (resp.status === 429) { toast.error("Za dużo prób, spróbuj za chwilę."); return; }
      if (resp.status === 402) { toast.error("Brak kredytów AI. Doładuj w ustawieniach."); return; }
      const json = await resp.json();
      setReply(json.message ?? "");
      setProposals(json.events ?? []);
    } catch (e: any) {
      toast.error("Błąd AI: " + e.message);
    } finally { setBusy(false); }
  };

  const accept = async () => {
    if (!user) return;
    const rows = proposals.map(p => ({ user_id: user.id, event_date: p.date, event_time: p.time, content: p.content }));
    const { error } = await supabase.from("study_events").insert(rows);
    if (error) toast.error(error.message);
    else { toast.success("Dodano plan nauki"); onPlanned(); }
  };

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Pomocnik AI</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Label>Powiedz, kiedy chcesz się uczyć</Label>
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
        <Button className="w-full" onClick={ask} disabled={busy}>
          <Sparkles className="w-4 h-4 mr-1" /> {busy ? "Myślę..." : "Zaproponuj plan"}
        </Button>
        {reply && <div className="text-sm bg-secondary rounded-lg p-3 whitespace-pre-wrap">{reply}</div>}
        {proposals.length > 0 && (
          <div className="space-y-2">
            <div className="font-semibold text-sm">Propozycje ({proposals.length}):</div>
            {proposals.map((p, i) => (
              <div key={i} className="text-xs bg-card border border-border rounded p-2">
                <b>{p.date} {p.time}</b> — {p.content}
              </div>
            ))}
            <Button className="w-full" onClick={accept}>Zapisz w kalendarzu</Button>
          </div>
        )}
      </div>
    </DialogContent>
  );
}
