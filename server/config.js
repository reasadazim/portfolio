import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const serverDirectory = fileURLToPath(new URL("./", import.meta.url));

export function loadConfig(environment = process.env) {
  // Explicit path works from the repository root or the server directory.
  const file =
    dotenv.config({
      path: join(serverDirectory, ".env"),
      quiet: true,
      processEnv: {},
    }).parsed || {};
  const env = { ...file, ...environment };
  const number = (name, fallback) => {
    const value = Number(env[name] || fallback);
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`Invalid ${name} setting.`);
    return value;
  };
  return {
    apiKey: env.GEMINI_API_KEY || "",
    model: env.GEMINI_MODEL || "gemini-2.5-flash",
    sessionSecret: env.SESSION_SECRET || "",
    allowedOrigins: (
      env.ALLOWED_ORIGINS ||
      "https://reasadazim.com,https://www.reasadazim.com,http://127.0.0.1:8091,http://127.0.0.1:8092"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    smtpHost: env.SMTP_HOST || "",
    smtpPort: number("SMTP_PORT", 587),
    smtpEncryption: env.SMTP_ENCRYPTION || "tls",
    smtpUsername: env.SMTP_USERNAME || "",
    smtpPassword: env.SMTP_PASSWORD || "",
    smtpFrom: env.SMTP_FROM || "",
    chatLimitPerIP: number("DAILY_CHAT_LIMIT_PER_IP", 80),
    chatLimitGlobal: number("DAILY_CHAT_LIMIT_GLOBAL", 1000),
    emailLimitPerIP: number("DAILY_EMAIL_LIMIT_PER_IP", 3),
    port: number("PORT", 8093),
    host: env.HOST || "127.0.0.1",
    production: env.NODE_ENV === "production",
    trustProxy: env.TRUST_PROXY === "1" ? 1 : false,
    runtimeDirectory: join(serverDirectory, "runtime", "node"),
  };
}
