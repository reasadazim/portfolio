import express from "express";
import session from "express-session";
import fileStoreFactory from "session-file-store";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { AssistantError } from "./errors.js";
import {
  runAgent,
  validateChatMessage,
  enquiryIntentResponse,
} from "./agent.js";
import { draftEnquiry, emailReady, enquiryMail, recipient } from "./enquiry.js";
import { createLimiter, createMutex } from "./limits.js";

const FileStore = fileStoreFactory(session);
const callSession = (visitor, method) =>
  new Promise((resolve, reject) =>
    visitor[method]((error) => (error ? reject(error) : resolve())),
  );
const equal = (left, right) =>
  typeof left === "string" &&
  typeof right === "string" &&
  Buffer.byteLength(left) === Buffer.byteLength(right) &&
  timingSafeEqual(Buffer.from(left), Buffer.from(right));

export function createApp({
  config,
  ai,
  mailer,
  knowledge,
  store,
  limiter,
  serveDirectory,
}) {
  if (!config.sessionSecret || config.sessionSecret.length < 32)
    throw new Error(
      "Set SESSION_SECRET to a random value of at least 32 characters in server/.env.",
    );
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  const runtime = config.runtimeDirectory;
  if (!store) {
    mkdirSync(join(runtime, "sessions"), { recursive: true, mode: 0o700 });
    store = new FileStore({
      path: join(runtime, "sessions"),
      ttl: 7200,
      retries: 0,
      secret: config.sessionSecret,
      logFn: () => {},
    });
  }
  const limit = limiter || createLimiter(join(runtime, "limits"));
  const lock = createMutex();
  const router = express.Router();
  router.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const origin = req.get("origin");
    if (origin && !config.allowedOrigins.includes(origin))
      return next(new AssistantError("This origin is not allowed.", 403));
    if (req.method === "POST" && !origin)
      return next(new AssistantError("A same-site origin is required.", 403));
    if (req.method === "POST" && !req.is("application/json"))
      return next(new AssistantError("JSON is required.", 415));
    next();
  });
  router.use(express.json({ limit: 24000, strict: true }));
  router.use(
    session({
      name: "portfolio_assistant_node",
      secret: config.sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure: config.production,
        maxAge: 7200000,
      },
    }),
  );

  async function handle(req, res, next) {
    try {
      await lock(req.sessionID, async () => {
        // Refresh after waiting: another request may have updated this same draft.
        if (req.session.started) await callSession(req.session, "reload");
        if (
          !req.session.started ||
          Date.now() - req.session.started > 7200000
        ) {
          await callSession(req.session, "regenerate");
          req.session.started = Date.now();
          req.session.csrf = randomBytes(32).toString("hex");
          req.session.history = [];
        }
        let result;
        try {
          result = await action(req);
        } finally {
          await callSession(req.session, "save");
        }
        res.json(result);
      });
    } catch (error) {
      next(error);
    }
  }

  async function action(req) {
    const visitor = req.session;
    const ip = req.ip;
    const draft = visitor.draft;
    const freshDraft =
      draft?.status === "draft" && Date.now() / 1000 - draft.created <= 900;
    if (req.method === "GET") {
      await limit(`status-minute:${ip}`, 60, 60);
      return {
        csrf: visitor.csrf,
        aiReady: Boolean(config.apiKey),
        emailReady: emailReady(config),
        history: visitor.history,
        draft: freshDraft ? draft : null,
      };
    }
    const body = req.body;
    if (!body || !equal(body.csrf, visitor.csrf))
      throw new AssistantError(
        "Your session expired. Please reopen the chat.",
        403,
      );
    const action = req.path === "/chat" ? "chat" : body.action;
    if (action === "reset") {
      visitor.history = [];
      delete visitor.draft;
      return { ok: true };
    }
    if (action === "prepare") {
      await limit(`prepare-minute:${ip}`, 12, 60);
      if (body.website) throw new AssistantError("Invalid enquiry.");
      visitor.draft = draftEnquiry(body);
      return { draft: visitor.draft };
    }
    if (action === "send") {
      if (!draft || !equal(body.draftId, draft.id))
        throw new AssistantError(
          "Please prepare and review your enquiry first.",
        );
      if (body.consent !== true)
        throw new AssistantError("Please approve sending this enquiry first.");
      if (draft.status === "sent") return { sent: true };
      if (Date.now() / 1000 - draft.created > 900)
        throw new AssistantError(
          "This draft expired. Please review a new draft.",
        );
      if (draft.status !== "draft")
        throw new AssistantError(
          "Delivery could not be confirmed. Please email Reasad directly.",
          409,
        );
      if (!emailReady(config) || !mailer)
        throw new AssistantError(
          `Email delivery is temporarily unavailable. Please email ${recipient} directly.`,
          503,
        );
      await limit(`email-day:${ip}`, config.emailLimitPerIP, 86400);
      await limit("email-global", 100, 86400);
      draft.status = "sending";
      await callSession(visitor, "save"); // A crash/retry cannot silently send the same draft twice.
      try {
        const delivery = await mailer.sendMail(enquiryMail(draft, config));
        if (
          !delivery.accepted?.some(
            (address) => address.toLowerCase() === recipient,
          )
        )
          throw new Error("Recipient was not accepted.");
        draft.status = "sent";
      } catch {
        draft.status = "unconfirmed";
        console.error(
          "Portfolio assistant: SMTP delivery could not be confirmed.",
        );
        throw new AssistantError(
          `Delivery could not be confirmed. Please email ${recipient} directly.`,
          503,
        );
      }
      return { sent: true };
    }
    if (action !== "chat") throw new AssistantError("Unknown action.");
    validateChatMessage(body.message);
    // Opening a form sends no email and should work even during an AI outage.
    const enquiryIntent = enquiryIntentResponse(body.message, visitor.history);
    if (enquiryIntent) {
      await limit(`form-minute:${ip}`, 12, 60);
      visitor.history = enquiryIntent.history;
      return {
        reply: enquiryIntent.reply,
        response: enquiryIntent.reply,
        enquiryRequested: true,
      };
    }
    if (!config.apiKey || !ai)
      throw new AssistantError(
        `AI chat is currently offline. Please send an enquiry or email ${recipient}.`,
        503,
      );
    await limit(`chat-minute:${ip}`, 12, 60);
    await limit(`chat-day:${ip}`, config.chatLimitPerIP, 86400);
    await limit("chat-global", config.chatLimitGlobal, 86400);
    const result = await runAgent({
      message: body.message,
      history: visitor.history,
      config,
      knowledge,
      ai,
    });
    visitor.history = result.history;
    // The sample's client-supplied history is deliberately replaced by server history.
    return {
      reply: result.reply,
      response: result.reply,
      enquiryRequested: result.enquiryRequested,
    };
  }

  router
    .route("/assistant.php")
    .get(handle)
    .post(handle)
    .all((req, res) => res.status(405).json({ error: "Method not allowed." }));
  router.post("/chat", handle);
  router.use((req, res) => res.status(404).json({ error: "Not found." }));
  app.use("/api", router);
  if (serveDirectory)
    app.use(express.static(serveDirectory, { dotfiles: "deny" }));
  app.use((req, res) => res.status(404).json({ error: "Not found." }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof AssistantError)
      return res.status(error.status).json({ error: error.message });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Your message is too long." });
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid request." });
    console.error("Portfolio assistant: backend request failed.");
    res.status(503).json({
      error: `The assistant is temporarily unavailable. Please email ${recipient}.`,
    });
  });
  return app;
}
