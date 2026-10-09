import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createGeminiClient } from "./agent.js";
import { createMailer } from "./enquiry.js";

try {
  const config = loadConfig();
  const app = createApp({
    config,
    ai: createGeminiClient(config),
    mailer: createMailer(config),
    knowledge: JSON.parse(
      readFileSync(new URL("./knowledge.json", import.meta.url), "utf8"),
    ),
    serveDirectory: fileURLToPath(new URL("../dist/", import.meta.url)),
  });
  const server = app.listen(config.port, config.host, (error) => {
    if (error) return;
    console.log(
      `Portfolio backend running at http://${config.host}:${config.port}`,
    );
    console.log(
      `Gemini chat: ${config.apiKey ? "configured" : "offline — set GEMINI_API_KEY in server/.env"}`,
    );
  });
  server.on("error", (error) => {
    console.error(
      `Portfolio backend could not start (${error.code || "unknown"}).`,
    );
    process.exit(1);
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000).unref();
    });
} catch {
  console.error(
    "Portfolio backend could not start. Check server/.env, SESSION_SECRET, and the generated server/knowledge.json. See README.md.",
  );
  process.exit(1);
}
