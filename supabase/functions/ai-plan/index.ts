// Supabase Edge Function — Deno runtime.
// Deploy with: supabase functions deploy ai-plan
// Set the Lovable AI key with: supabase secrets set LOVABLE_API_KEY=...

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM = `Jesteś pomocnym asystentem nauki C++. Użytkownik powie ci kiedy chce się uczyć.
Zaplanuj realistyczny harmonogram nauki (maks. 14 sesji). Odpowiadaj po polsku.
Zawsze wywołuj funkcję propose_plan z listą sesji. Każda sesja: date (YYYY-MM-DD), time (HH:MM, 24h), content (krótki opis).`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { prompt } = (await req.json()) as { prompt?: string };
    if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
      return json({ error: "Niepoprawne dane" }, 400);
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Brak konfiguracji AI" }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `${SYSTEM}\nDzisiaj jest ${today}.` },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "propose_plan",
              description: "Zwróć plan nauki",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
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
          },
        ],
        tool_choice: { type: "function", function: { name: "propose_plan" } },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limit" }, 429);
    if (resp.status === 402) return json({ error: "Brak kredytów" }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return json({ error: "Błąd AI" }, 500);
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let summary = "Oto proponowany plan nauki.";
    let sessions: any[] = [];
    if (call?.function?.arguments) {
      try {
        const args = JSON.parse(call.function.arguments);
        summary = args.summary || summary;
        sessions = Array.isArray(args.sessions) ? args.sessions : [];
      } catch (e) {
        console.error("parse args", e);
      }
    }

    const events = sessions
      .filter(
        (s: any) =>
          /^\d{4}-\d{2}-\d{2}$/.test(s?.date) &&
          /^\d{2}:\d{2}$/.test(s?.time) &&
          typeof s?.content === "string",
      )
      .slice(0, 14);

    return json({ message: summary, events });
  } catch (e: any) {
    console.error("ai-plan err", e);
    return json({ error: e?.message ?? "error" }, 500);
  }
});
