import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { AssistantError } from "./errors.js";
import { enquiryRecipient } from "../src/data/assistant.js";

export const recipient = enquiryRecipient;
export function validEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
  );
}

export function draftEnquiry(input) {
  if (
    !["name", "email", "message"].every(
      (field) => typeof input[field] === "string",
    )
  )
    throw new AssistantError(
      "Please provide your name, email, and project details.",
    );
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  if ([...name].length < 2 || [...name].length > 100 || /[\r\n]/.test(name))
    throw new AssistantError(
      "Please enter a name between 2 and 100 characters.",
    );
  if (!validEmail(email))
    throw new AssistantError("Please enter a valid email address.");
  if ([...message].length < 10 || [...message].length > 4000)
    throw new AssistantError(
      "Please describe your project in 10–4000 characters.",
    );
  return {
    id: randomBytes(16).toString("hex"),
    recipient,
    created: Math.floor(Date.now() / 1000),
    status: "draft",
    name,
    email,
    message,
  };
}

export function emailReady(config) {
  return Boolean(
    config.smtpHost &&
    config.smtpUsername &&
    config.smtpPassword &&
    validEmail(config.smtpFrom),
  );
}

export function enquiryMail(draft, config) {
  return {
    from: { name: "Reasad Azim Portfolio", address: config.smtpFrom },
    to: recipient,
    replyTo: { name: draft.name, address: draft.email },
    subject: `New portfolio enquiry from ${draft.name}`,
    text: `New enquiry from your portfolio assistant\n\nName: ${draft.name}\nReply email: ${draft.email}\n\n${draft.message}\n\nThe visitor reviewed and approved this enquiry.`,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function createMailer(config) {
  if (!emailReady(config)) return null;
  if (!["tls", "ssl"].includes(config.smtpEncryption))
    throw new Error("SMTP_ENCRYPTION must be tls or ssl.");
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpEncryption === "ssl",
    requireTLS: config.smtpEncryption === "tls",
    auth: { user: config.smtpUsername, pass: config.smtpPassword },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
