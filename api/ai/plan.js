const SYSTEM = `Jesteś pomocnym asystentem nauki C++. Użytkownik powie ci kiedy chce się uczyć.
Zaplanuj realistyczny harmonogram nauki (maks. 14 sesji). Odpowiadaj po polsku.
Zwróć WYŁĄCZNIE poprawny JSON w formacie:
{"message":"...","events":[{"date":"YYYY-MM-DD","time":"HH:MM","content":"..."}]}
Nie dodawaj żadnego dodatkowego tekstu poza JSON.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}

function extractJson(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== "POST") {
      send(res, 405, { error: "Method not allowed" });
      return;
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      send(res, 500, { error: "Missing OPENROUTER_API_KEY" });
      return;
    }

    const prompt = req.body?.prompt;
    if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
      send(res, 400, { error: "Niepoprawne dane" });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    const callOpenRouter = async (payload) => {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return resp;
    };

    const basePayload = {
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${SYSTEM}\nDzisiaj jest ${today}.` },
        { role: "user", content: prompt },
      ],
    };

    let upstream = await callOpenRouter({
      ...basePayload,
      response_format: { type: "json_object" },
    });

    if (!upstream.ok && upstream.status === 400) {
      const errText = await upstream.text();
      if (errText.includes("response_format") || errText.includes("json_object")) {
        upstream = await callOpenRouter(basePayload);
      } else {
        send(res, 500, { error: "Błąd AI", details: errText.slice(0, 2000) });
        return;
      }
    }

    if (upstream.status === 429) {
      send(res, 429, { error: "Rate limit" });
      return;
    }

    if (!upstream.ok) {
      const t = await upstream.text();
      send(res, 500, { error: "Błąd AI", details: t.slice(0, 2000) });
      return;
    }

    const raw = await upstream.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      send(res, 500, {
        error: "Błąd AI (niepoprawny JSON z OpenRouter)",
        details: raw.slice(0, 2000),
      });
      return;
    }

    const content = data?.choices?.[0]?.message?.content;
    const json = extractJson(content);
    const message =
      typeof json?.message === "string" && json.message.trim()
        ? json.message.trim()
        : "Oto proponowany plan nauki.";
    const rawEvents = Array.isArray(json?.events) ? json.events : [];

    const events = rawEvents
      .filter(
        (e) =>
          /^\d{4}-\d{2}-\d{2}$/.test(e?.date) &&
          /^\d{2}:\d{2}$/.test(e?.time) &&
          typeof e?.content === "string" &&
          e.content.trim(),
      )
      .slice(0, 14)
      .map((e) => ({ date: e.date, time: e.time, content: e.content.trim() }));

    send(res, 200, { message, events });
  } catch (e) {
    send(res, 500, { error: "Błąd AI", details: String(e?.message ?? e).slice(0, 2000) });
  }
};
