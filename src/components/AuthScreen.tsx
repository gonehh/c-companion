import { useState } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Code2 } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nick, setNick] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-sm self-center">
          <View className="mb-8 items-center">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/20">
              <Code2 color="#a173e8" size={32} />
            </View>
            <Text className="text-2xl font-bold text-foreground">C++ Quest</Text>
            <Text className="mt-1 text-sm text-muted-foreground">Nauka C++ krok po kroku</Text>
          </View>

          <View className="rounded-2xl border border-border bg-card p-5">
            <View className="mb-5 flex-row gap-2 rounded-lg bg-muted p-1">
              <Pressable
                onPress={() => setMode("login")}
                className={cn(
                  "flex-1 items-center rounded-md py-2",
                  mode === "login" && "bg-primary",
                )}
              >
                <Text
                  className={cn(
                    "text-sm",
                    mode === "login" ? "text-primary-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  Logowanie
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("signup")}
                className={cn(
                  "flex-1 items-center rounded-md py-2",
                  mode === "signup" && "bg-primary",
                )}
              >
                <Text
                  className={cn(
                    "text-sm",
                    mode === "signup" ? "text-primary-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  Rejestracja
                </Text>
              </Pressable>
            </View>

            <View className="gap-4">
              <View>
                <Label>Nick</Label>
                <Input value={nick} onChangeText={setNick} maxLength={24} placeholder="np. olaCpp" autoCapitalize="none" />
              </View>
              <View>
                <Label>Hasło</Label>
                <Input value={pw} onChangeText={setPw} secureTextEntry />
              </View>
              {mode === "signup" && (
                <View>
                  <Label>Powtórz hasło</Label>
                  <Input value={pw2} onChangeText={setPw2} secureTextEntry />
                </View>
              )}
              <Button onPress={submit} loading={busy} disabled={busy}>
                {mode === "signup" ? "Stwórz konto" : "Zaloguj"}
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
