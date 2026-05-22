import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/AuthScreen";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "C++ Quest — Nauka C++ krok po kroku" },
      { name: "description", content: "Mobilna aplikacja do nauki C++: 100 poziomów, quizy, medale i planer nauki z pomocą AI." },
      { property: "og:title", content: "C++ Quest" },
      { property: "og:description", content: "Naucz się C++ w prostych krokach z planerem AI." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthProvider>
      <Inner />
      <Toaster />
    </AuthProvider>
  );
}

function Inner() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Ładowanie...</div>;
  }
  return user ? <AppShell /> : <AuthScreen />;
}
