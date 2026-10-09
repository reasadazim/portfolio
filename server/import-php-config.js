// One-time local migration. Values remain in memory and are never printed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { join } from "node:path";
import { serverDirectory } from "./config.js";

const target = join(serverDirectory, ".env");
if (existsSync(target)) {
  console.log("server/.env already exists; existing values were preserved.");
} else {
  try {
    const old = existsSync(join(serverDirectory, "config.local.php"))
      ? JSON.parse(
          execFileSync(
            "php",
            [
              "-r",
              "$config = require 'server/config.local.php'; echo json_encode($config, JSON_THROW_ON_ERROR);",
            ],
            {
              cwd: join(serverDirectory, ".."),
              encoding: "utf8",
              stdio: ["ignore", "pipe", "ignore"],
            },
          ),
        )
      : {};
    const values = {
      GEMINI_API_KEY: old.gemini_api_key || "",
      GEMINI_MODEL: "gemini-2.5-flash",
      SESSION_SECRET: randomBytes(32).toString("hex"),
      ALLOWED_ORIGINS: (
        old.allowed_origins || [
          "https://reasadazim.com",
          "https://www.reasadazim.com",
          "http://127.0.0.1:8091",
          "http://127.0.0.1:8092",
        ]
      ).join(","),
      SMTP_HOST: old.smtp_host || "",
      SMTP_PORT: old.smtp_port || 587,
      SMTP_ENCRYPTION: old.smtp_encryption || "tls",
      SMTP_USERNAME: old.smtp_username || "",
      SMTP_PASSWORD: old.smtp_password || "",
      SMTP_FROM: old.smtp_from || "",
      DAILY_CHAT_LIMIT_PER_IP: old.daily_chat_limit_per_ip || 80,
      DAILY_CHAT_LIMIT_GLOBAL: old.daily_chat_limit_global || 1000,
      DAILY_EMAIL_LIMIT_PER_IP: old.daily_email_limit_per_ip || 3,
    };
    const lines = [];
    for (const [name, raw] of Object.entries(values)) {
      const value = String(raw);
      const encoded = ["'", '"', "`"]
        .filter((quote) => !value.includes(quote))
        .map((quote) => `${quote}${value}${quote}`)
        .find((quoted) => dotenv.parse(`${name}=${quoted}`)[name] === value);
      if (!encoded)
        throw new Error("An existing credential needs manual entry.");
      lines.push(`${name}=${encoded}`);
    }
    const template = readFileSync(
      join(serverDirectory, ".env.example"),
      "utf8",
    );
    const content = template.replace(
      /^([A-Z_]+)=.*$/gm,
      (line, key) => lines.find((entry) => entry.startsWith(`${key}=`)) || line,
    );
    writeFileSync(target, content, { flag: "wx", mode: 0o600 });
    console.log(
      "Created private server/.env and preserved existing Gemini/SMTP credentials. No credential values were displayed.",
    );
  } catch {
    console.error(
      "Could not import private settings. Copy server/.env.example to server/.env and fill it in privately.",
    );
    process.exitCode = 1;
  }
}
