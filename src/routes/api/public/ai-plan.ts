import { createFileRoute } from "@tanstack/react-router";

type Mode = "suggest" | "evaluate" | "improve";

const SYSTEMS: Record<Mode, string> = {
  suggest: `Jesteś mentorem nauki C++. Zaproponuj realistyczny, zbalansowany harmonogram (max 14 sesji), z przerwami między dniami, krótkimi sesjami (20-45 min). Odpowiadaj po polsku. ZAWSZE wywołaj funkcję propose_plan z polem 'sessions' (lista) i 'summary' (krótka ocena).`,
  evaluate: `Jesteś mentorem nauki C++. Użytkownik opisze swój plan nauki. Oceń go: czy jest realistyczny, czy ma przerwy (unikaj wypalenia), czy obciążenie dzienne jest sensowne. Wypisz mocne i słabe strony. Odpowiadaj po polsku. Wywołaj funkcję propose_plan: 'summary' = twoja ocena (kilka zdań, konkretnie), 'sessions' = pusta lista (nie proponujesz nowych sesji w trybie oceny).`,
  improve: `Jesteś mentorem nauki C++. Użytkownik opisze swój plan. Popraw go: dodaj przerwy, zbalansuj dzienne obciążenie, rozłóż trudne tematy, unikaj wypalenia. Odpowiadaj po polsku. ZAWSZE wywołaj funkcję propose_plan z 'summary' (co poprawiłeś) i 'sessions' (poprawiony plan, max 14 sesji).`,
};

export const Route = createFileRoute("/api/public/ai-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { prompt?: string; mode?: Mode };
          const prompt = body.prompt;
          const mode: Mode = body.mode === "evaluate" || body.mode === "improve" ? body.mode : "suggest";
          if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
            return Response.json({ error: "Niepoprawne dane" }, { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return Response.json({ error: "Brak konfiguracji AI" }, { status: 500 });

          const today = new Date().toISOString().slice(0, 10);
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEMS[mode] + `\nDzisiaj jest ${today}.` },
                { role: "user", content: prompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "propose_plan",
                  description: "Zwróć ocenę i/lub plan nauki",
                  parameters: {
                    type: "object",
                    properties: {
                      summary: { type: "string", description: "Ocena lub opis planu po polsku" },
                      sessions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string" },
                            time: { type: "string" },
                            content: { type: "string" },
                          },
                          required: ["date", "time", "content"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["summary", "sessions"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "propose_plan" } },
            }),
          });

          if (resp.status === 429) return Response.json({ error: "Rate limit" }, { status: 429 });
          if (resp.status === 402) return Response.json({ error: "Brak kredytów" }, { status: 402 });
          if (!resp.ok) {
            const t = await resp.text();
            console.error("AI error", resp.status, t);
            return Response.json({ error: "Błąd AI" }, { status: 500 });
          }

          const data = await resp.json();
          const call = data.choices?.[0]?.message?.tool_calls?.[0];
          let summary = "Oto odpowiedź mentora.";
          let sessions: any[] = [];
          if (call?.function?.arguments) {
            try {
              const args = JSON.parse(call.function.arguments);
              summary = args.summary || summary;
              sessions = Array.isArray(args.sessions) ? args.sessions : [];
            } catch (e) { console.error("parse args", e); }
          }
          const events = sessions
            .filter((s: any) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && /^\d{2}:\d{2}$/.test(s.time) && typeof s.content === "string")
            .slice(0, 14);

          return Response.json({ message: summary, events });
        } catch (e: any) {
          console.error("ai-plan err", e);
          return Response.json({ error: e?.message ?? "error" }, { status: 500 });
        }
      },
    },
  },
});
