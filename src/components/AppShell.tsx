import { useState } from "react";
import { BookOpen, User, Calendar } from "lucide-react";
import { CoursesTab } from "./CoursesTab";
import { ProfileTab } from "./ProfileTab";
import { CalendarTab } from "./CalendarTab";

type Tab = "courses" | "profile" | "calendar";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("courses");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-extrabold tracking-tight">
          C++ <span className="text-primary">Quest</span>
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        {tab === "courses" && <CoursesTab />}
        {tab === "profile" && <ProfileTab />}
        {tab === "calendar" && <CalendarTab />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border">
        <div className="flex max-w-md mx-auto">
          <TabBtn active={tab === "courses"} onClick={() => setTab("courses")} icon={<BookOpen className="w-5 h-5" />} label="Kursy" />
          <TabBtn active={tab === "profile"} onClick={() => setTab("profile")} icon={<User className="w-5 h-5" />} label="Profil" />
          <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")} icon={<Calendar className="w-5 h-5" />} label="Kalendarz" />
        </div>
      </nav>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${active ? "text-primary" : "text-muted-foreground"}`}>
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}
