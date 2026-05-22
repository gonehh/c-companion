import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Code2 } from "lucide-react";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nick, setNick] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (pw !== pw2) {
          toast.error("Hasła nie są takie same.");
          return;
        }
        const { error } = await signUp(nick, pw);
        if (error) toast.error(error);
        else toast.success("Konto utworzone!");
      } else {
        const { error } = await signIn(nick, pw);
        if (error) toast.error(error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-3">
            <Code2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">C++ Quest</h1>
          <p className="text-sm text-muted-foreground mt-1">Nauka C++ krok po kroku</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex gap-2 mb-5 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm rounded-md transition ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Logowanie</button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm rounded-md transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Rejestracja</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="nick">Nick</Label>
              <Input id="nick" value={nick} onChange={(e) => setNick(e.target.value)} required maxLength={24} placeholder="np. olaCpp" />
            </div>
            <div>
              <Label htmlFor="pw">Hasło</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="pw2">Powtórz hasło</Label>
                <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Chwila..." : mode === "signup" ? "Stwórz konto" : "Zaloguj"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
