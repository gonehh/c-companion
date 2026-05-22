const fs = require("fs");
const http = require("http");
const path = require("path");

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .forEach((line) => {
        const idx = line.indexOf("=");
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (!key) return;
        if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
      });
  } catch {}
}

loadEnvFile(path.join(__dirname, ".env.local"));
loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.AI_API_PORT ?? 8787);

const aiPlan = require("./api/ai/plan");

const server = http.createServer((req, res) => {
  const url = req.url?.split("?")[0] ?? "";

  if (url === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url !== "/api/ai/plan") {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if (req.method === "OPTIONS") {
    aiPlan(req, res);
    return;
  }

  if (req.method !== "POST") {
    aiPlan(req, res);
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString("utf8");
    if (body.length > 1_000_000) req.destroy();
  });
  req.on("end", () => {
    try {
      req.body = body ? JSON.parse(body) : {};
    } catch {
      req.body = {};
    }
    aiPlan(req, res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`AI API listening on http://localhost:${PORT}\n`);
});
