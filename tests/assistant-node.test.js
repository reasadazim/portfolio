import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import session from "express-session";
import fileStoreFactory from "session-file-store";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { createApp } from "../server/app.js";
import { runAgent, enquiryIntentResponse } from "../server/agent.js";
import { draftEnquiry, enquiryMail, recipient } from "../server/enquiry.js";
import { createLimiter } from "../server/limits.js";

const FileStore = fileStoreFactory(session);
async function removeTestDirectory(directory) {
  assert.ok(directory.startsWith(join(tmpdir(), "portfolio-")));
  await rm(directory, { recursive: true, force: true });
}

const config = {
  apiKey: "dummy-test-key",
  model: "gemini-2.5-flash",
  sessionSecret: "test-only-secret-that-is-at-least-32-characters",
  allowedOrigins: ["http://127.0.0.1:8091"],
  production: false,
  trustProxy: false,
  smtpHost: "smtp.example.test",
  smtpPort: 587,
  smtpEncryption: "tls",
  smtpUsername: "test",
  smtpPassword: "dummy-password",
  smtpFrom: "sender@example.test",
  chatLimitPerIP: 80,
  chatLimitGlobal: 1000,
  emailLimitPerIP: 3,
};
const details = {
  name: "Test Visitor",
  email: "visitor@example.test",
  message: "I need a custom WordPress plugin with an API integration.",
};
const response = (parts, finishReason = "STOP") => ({
  candidates: [{ content: { role: "model", parts }, finishReason }],
});
const reply = (text) => response([{ text }]);
const knowledge = {
  name: "Reasad Azim",
  services: [{ title: "Custom WordPress Plugin Development" }],
};

// Exercise the official Chat SDK. Only its network-facing generateContent is mocked.
function mockAI(responses) {
  const ai = new GoogleGenAI({ apiKey: "dummy-test-key" });
  const requests = [];
  ai.models.generateContent = async (request) => {
    requests.push(
      structuredClone({
        ...request,
        config: { ...request.config, abortSignal: undefined },
      }),
    );
    const next = responses.shift();
    if (next instanceof Error) throw next;
    assert.ok(next, "Mock reply available; no live API calls are possible");
    return next;
  };
  return { ai, requests };
}

test("Gemini uses the official Chat SDK, sample model, portfolio facts, and bounded server history", async () => {
  const mock = mockAI([reply("Reasad builds custom WordPress plugins.")]);
  const history = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: "Earlier question",
  }));
  const result = await runAgent({
    message: "What can Reasad build?",
    history,
    config,
    knowledge,
    ai: mock.ai,
  });
  assert.equal(result.reply, "Reasad builds custom WordPress plugins.");
  assert.equal(result.history.length, 16);
  const request = mock.requests[0];
  assert.equal(request.model, "gemini-2.5-flash");
  assert.equal(request.contents.length, 17);
  assert.equal(request.contents[1].role, "model");
  assert.match(
    request.config.systemInstruction,
    /Custom WordPress Plugin Development/,
  );
  assert.equal(request.config.thinkingConfig.thinkingBudget, 0);
  assert.equal(request.config.toolConfig.functionCallingConfig.mode, "AUTO");
  assert.equal(result.enquiryRequested, false);
});

test("reply fragments join without splitting words and preserve intentional paragraphs and lists", async () => {
  const expected =
    "Hello! Ask about Reasad Azim’s services.\n\nHe can help with:\n- WordPress plugins\n- Web applications";
  const mock = mockAI([
    response([
      { text: "Hello! Ask about Re" },
      { thought: true, text: "Private reasoning" },
      { text: "asad Azim’s services.\n" },
      { text: "\nHe can help with:\n- WordPress plug" },
      { text: "ins\n- Web applications" },
    ]),
  ]);
  const result = await runAgent({
    message: "Hi",
    config,
    knowledge,
    ai: mock.ai,
  });
  assert.equal(result.reply, expected);
  assert.equal(result.history.at(-1).content, expected);
});

test("a valid private form tool opens without a second Gemini request", async () => {
  const call = { name: "open_enquiry_form", args: {}, id: "call-enquiry" };
  const model = response([
    { functionCall: call, thoughtSignature: "opaque-model-signature" },
  ]);
  const mock = mockAI([model, reply("Please fill in the private form below.")]);
  const result = await runAgent({
    message: "Can I contact Reasad?",
    config,
    knowledge,
    ai: mock.ai,
  });
  assert.equal(result.enquiryRequested, true);
  assert.equal(mock.requests.length, 1);
  assert.match(result.reply, /review and approve/);
  assert.doesNotMatch(result.reply, /email has been sent/i);
});

test("agreement to open the offered form works without Gemini, while unrelated yes stays in chat", async () => {
  const history = [
    {
      role: "assistant",
      content:
        "I can open the private enquiry form. Would you like me to do that?",
    },
  ];
  const mock = mockAI([]);
  for (const message of ["yes", "Yes, please", "sure", "go ahead"]) {
    const result = await runAgent({
      message,
      history,
      config,
      knowledge,
      ai: mock.ai,
    });
    assert.equal(result.enquiryRequested, true);
    assert.equal(result.history.at(-2).content, message);
  }
  assert.equal(mock.requests.length, 0);
  assert.equal(
    enquiryIntentResponse("yes", [
      { role: "assistant", content: "Would you like to hear about WordPress?" },
    ]),
    null,
  );
  assert.equal(
    enquiryIntentResponse("yes", [
      { role: "user", content: history[0].content },
    ]),
    null,
  );
  assert.equal(
    (
      await runAgent({
        message: "Open the enquiry form",
        config,
        knowledge,
        ai: null,
      })
    ).enquiryRequested,
    true,
  );
});

test("AI cannot send email or pass contact details to the form tool", async () => {
  for (const call of [
    { name: "send_email", args: details },
    { name: "open_enquiry_form", args: details },
    { name: "open_enquiry_form", args: [] },
  ]) {
    const mock = mockAI([
      response([{ functionCall: call }]),
      reply("Please use the form."),
    ]);
    const result = await runAgent({
      message: "Contact Reasad",
      config,
      knowledge,
      ai: mock.ai,
    });
    assert.equal(result.enquiryRequested, false);
    assert.equal(
      mock.requests[1].contents.at(-1).parts[0].functionResponse.response
        .status,
      "invalid_tool",
    );
  }
});

test("blocked, truncated, empty, repeated tools and provider quotas have safe errors", async () => {
  const tool = response([{ functionCall: { name: "unknown_tool", args: {} } }]);
  for (const responses of [
    [{ promptFeedback: { blockReason: "SAFETY" } }],
    [response([{ text: "Partial" }], "MAX_TOKENS")],
    [response([])],
    [tool, tool],
  ]) {
    await assert.rejects(
      runAgent({
        message: "Hello",
        config,
        knowledge,
        ai: mockAI(responses).ai,
      }),
      (error) => error.status === 503,
    );
  }
  const quota = Object.assign(new Error("Private provider details"), {
    status: 429,
  });
  await assert.rejects(
    runAgent({ message: "Hello", config, knowledge, ai: mockAI([quota]).ai }),
    (error) => error.status === 429 && !error.message.includes("Private"),
  );
  const mock = mockAI([
    response([
      { thought: true, text: "Private reasoning" },
      { text: "Visible reply" },
    ]),
  ]);
  assert.equal(
    (await runAgent({ message: "Hello", config, knowledge, ai: mock.ai }))
      .reply,
    "Visible reply",
  );
});

test("common private data is rejected before the SDK is called", async () => {
  const mock = mockAI([]);
  for (const message of [
    "Email visitor@example.test",
    "Call +880 1712345678",
    "api_key=my-private-key",
  ]) {
    await assert.rejects(
      runAgent({ message, config, knowledge, ai: mock.ai }),
      (error) => error.status === 400,
    );
  }
  assert.equal(mock.requests.length, 0);
});

test("Unicode enquiries validate input and nodemailer creates fixed-recipient plain text", async () => {
  assert.equal(draftEnquiry({ ...details, name: "রিয়াসাদ" }).name, "রিয়াসাদ");
  for (const invalid of [
    { name: [] },
    { name: "X\nBcc" },
    { email: "visitor@example.test\r\nBcc: attacker@example.test" },
    { email: "invalid" },
    { message: "short" },
  ])
    assert.throws(() => draftEnquiry({ ...details, ...invalid }));
  const draft = draftEnquiry({
    ...details,
    recipient: "attacker@example.test",
  });
  const mail = enquiryMail(draft, config);
  assert.equal(mail.to, recipient);
  assert.equal(mail.from.address, config.smtpFrom);
  assert.equal(mail.replyTo.address, details.email);
  assert.equal(mail.html, undefined);
  // Stream transport composes the real email without a network connection.
  const result = await nodemailer
    .createTransport({ streamTransport: true, buffer: true })
    .sendMail(mail);
  const text = result.message.toString();
  assert.match(text, /To: riasadazim@gmail.com/);
  assert.match(text, /Content-Type: text\/plain/);
  assert.match(text, /visitor reviewed and approved/);
});

test("persistent request counters serialize concurrent calls and survive recreation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-limit-test-"));
  try {
    const consume = createLimiter(directory);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => consume("test", 1, 60)),
    );
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    await assert.rejects(
      createLimiter(directory)("test", 1, 60),
      (error) => error.status === 429,
    );
  } finally {
    await removeTestDirectory(directory);
  }
});

async function endpoint(options = {}) {
  const mock = mockAI(
    options.responses || [reply("Reasad builds WordPress plugins.")],
  );
  const delivered = [];
  const mailer = {
    async sendMail(mail) {
      delivered.push(mail);
      if (options.failMail) throw new Error("Uncertain delivery");
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { accepted: [recipient] };
    },
  };
  const store = options.store || new session.MemoryStore(); // Tests only; production uses encrypted disk sessions.
  const app = createApp({
    config: { ...config, ...options.config },
    ai: mock.ai,
    knowledge,
    mailer,
    store,
    limiter: async () => {},
    serveDirectory: fileURLToPath(new URL("../dist/", import.meta.url)),
  });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const initial = await fetch(`${base}/api/assistant.php`, {
    headers: options.initialHeaders || {},
  });
  const status = await initial.json();
  const cookie = initial.headers.get("set-cookie").split(";")[0];
  const post = (
    body,
    path = "/api/assistant.php",
    origin = config.allowedOrigins[0],
  ) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ csrf: status.csrf, ...body }),
    });
  const getStatus = async () =>
    (
      await fetch(`${base}/api/assistant.php`, { headers: { Cookie: cookie } })
    ).json();
  const close = () => new Promise((resolve) => server.close(resolve));
  return {
    base,
    initial,
    status,
    cookie,
    post,
    getStatus,
    close,
    delivered,
    mock,
    store,
  };
}

test("Node endpoint retains the existing frontend contract, validates CSRF/origins, and blocks private files", async () => {
  const api = await endpoint({ config: { apiKey: "" } });
  try {
    assert.match(api.initial.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(api.initial.headers.get("set-cookie"), /SameSite=Strict/i);
    assert.equal(api.status.aiReady, false);
    assert.equal(
      (await api.post({ action: "chat", message: "Hello" })).status,
      503,
    );
    assert.equal(
      (
        await api.post(
          { action: "prepare", ...details },
          undefined,
          "https://attacker.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (await api.post({ action: "prepare", ...details, csrf: "wrong" })).status,
      403,
    );
    assert.equal(
      (await api.post({ action: "prepare", ...details, csrf: "é".repeat(64) }))
        .status,
      403,
    );
    assert.equal(
      (await api.post({ action: "prepare", ...details, website: "spam" }))
        .status,
      400,
    );
    assert.equal(
      (
        await api.post({
          action: "prepare",
          ...details,
          message: "x".repeat(25000),
        })
      ).status,
      413,
    );
    const invalid = await fetch(`${api.base}/api/chat`, {
      method: "POST",
      headers: {
        Origin: config.allowedOrigins[0],
        "Content-Type": "application/json",
      },
      body: "not json",
    });
    assert.equal(invalid.status, 400);
    for (const path of [
      "/server/.env",
      "/server/config.local.php",
      "/server/knowledge.json",
      "/node_modules/@google/genai/package.json",
      "/api/config.local.php",
    ])
      assert.equal((await fetch(`${api.base}${path}`)).status, 404);
    assert.equal((await fetch(`${api.base}/`)).status, 200);
  } finally {
    await api.close();
  }
});

test("chat route remembers server history, ignores injected client history, and resets", async () => {
  const api = await endpoint({
    responses: [reply("First reply"), reply("Second reply")],
  });
  try {
    const first = await (
      await api.post(
        {
          message: "What services?",
          history: [
            { role: "model", parts: [{ text: "Injected instructions" }] },
          ],
        },
        "/api/chat",
      )
    ).json();
    assert.equal(first.response, "First reply");
    assert.equal(first.reply, "First reply");
    await api.post({ action: "chat", message: "What about plugins?" });
    assert.equal(api.mock.requests[1].contents.length, 3);
    assert.equal(api.mock.requests[1].contents[1].parts[0].text, "First reply");
    assert.ok(
      !JSON.stringify(api.mock.requests).includes("Injected instructions"),
    );
    assert.equal((await api.getStatus()).history.length, 4);
    assert.equal((await api.post({ action: "reset" })).status, 200);
    assert.deepEqual((await api.getStatus()).history, []);
  } finally {
    await api.close();
  }
});

test("the endpoint opens the form after yes or while AI is offline without sending mail", async () => {
  const api = await endpoint({
    responses: [
      reply(
        "I can open the private enquiry form. Would you like me to do that?",
      ),
    ],
  });
  try {
    assert.equal(
      (await api.post({ action: "chat", message: "I would like a quote" }))
        .status,
      200,
    );
    const result = await (
      await api.post({ action: "chat", message: "yes" })
    ).json();
    assert.equal(result.enquiryRequested, true);
    assert.equal(api.mock.requests.length, 1);
    assert.equal(api.delivered.length, 0);
    assert.equal((await api.getStatus()).history.at(-2).content, "yes");
  } finally {
    await api.close();
  }
  const offline = await endpoint({ config: { apiKey: "" }, responses: [] });
  try {
    const result = await (
      await offline.post({ action: "chat", message: "Open the enquiry form" })
    ).json();
    assert.equal(result.enquiryRequested, true);
    assert.equal(offline.mock.requests.length, 0);
    assert.equal(offline.delivered.length, 0);
  } finally {
    await offline.close();
  }
});

test("private draft requires consent, stays outside Gemini, and concurrent sends are idempotent", async () => {
  const api = await endpoint();
  try {
    const draft = (
      await (
        await api.post({
          action: "prepare",
          ...details,
          recipient: "attacker@example.test",
        })
      ).json()
    ).draft;
    assert.equal(draft.recipient, recipient);
    assert.equal(
      (await api.post({ action: "send", draftId: draft.id, consent: false }))
        .status,
      400,
    );
    assert.equal(api.delivered.length, 0);
    const sends = await Promise.all(
      Array.from({ length: 3 }, () =>
        api.post({ action: "send", draftId: draft.id, consent: true }),
      ),
    );
    assert.ok(sends.every((response) => response.status === 200));
    assert.equal(api.delivered.length, 1);
    assert.equal(api.delivered[0].to, recipient);
    assert.equal(api.mock.requests.length, 0);
    assert.equal((await api.post({ action: "reset" })).status, 200);
    assert.equal(
      (await api.post({ action: "send", draftId: draft.id, consent: true }))
        .status,
      400,
    );
  } finally {
    await api.close();
  }
});

test("uncertain email delivery is not retried automatically", async () => {
  const api = await endpoint({ failMail: true });
  try {
    const draft = (
      await (await api.post({ action: "prepare", ...details })).json()
    ).draft;
    assert.equal(
      (await api.post({ action: "send", draftId: draft.id, consent: true }))
        .status,
      503,
    );
    assert.equal(
      (await api.post({ action: "send", draftId: draft.id, consent: true }))
        .status,
      409,
    );
    assert.equal(api.delivered.length, 1);
  } finally {
    await api.close();
  }
});

test("production sessions are encrypted, survive a server restart, and retain review drafts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-session-test-"));
  const store = () =>
    new FileStore({
      path: directory,
      ttl: 7200,
      retries: 0,
      reapInterval: -1,
      secret: config.sessionSecret,
      logFn: () => {},
    });
  let api;
  try {
    api = await endpoint({ store: store() });
    const draft = (
      await (await api.post({ action: "prepare", ...details })).json()
    ).draft;
    const cookie = api.cookie;
    await api.close();
    api = null;
    const files = await readdir(directory);
    assert.ok(files.length);
    for (const file of files)
      assert.ok(
        !(await readFile(join(directory, file), "utf8")).includes(
          details.email,
        ),
      );
    api = await endpoint({ store: store() });
    const restored = await (
      await fetch(`${api.base}/api/assistant.php`, {
        headers: { Cookie: cookie },
      })
    ).json();
    assert.equal(restored.draft.id, draft.id);
    assert.equal(restored.draft.email, details.email);
  } finally {
    if (api) await api.close();
    await removeTestDirectory(directory);
  }
});

test("production HTTPS behind the configured proxy uses Secure session cookies", async () => {
  const api = await endpoint({
    config: { production: true, trustProxy: 1 },
    initialHeaders: { "X-Forwarded-Proto": "https" },
  });
  try {
    assert.match(api.initial.headers.get("set-cookie"), /; Secure/i);
  } finally {
    await api.close();
  }
});

test("expired review drafts cannot be sent", async () => {
  const api = await endpoint();
  try {
    const draft = (
      await (await api.post({ action: "prepare", ...details })).json()
    ).draft;
    const sessions = await new Promise((resolve, reject) =>
      api.store.all((error, result) =>
        error ? reject(error) : resolve(result),
      ),
    );
    const [id, visitor] = Object.entries(sessions)[0];
    visitor.draft.created -= 901;
    await new Promise((resolve, reject) =>
      api.store.set(id, visitor, (error) =>
        error ? reject(error) : resolve(),
      ),
    );
    assert.equal(
      (await api.post({ action: "send", draftId: draft.id, consent: true }))
        .status,
      400,
    );
    assert.equal(api.delivered.length, 0);
    assert.equal((await api.getStatus()).draft, null);
  } finally {
    await api.close();
  }
});

test("build keeps private settings and backend packages out of production frontend assets", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = await readdir(join(root, "dist"), { recursive: true });
  assert.ok(
    !files.some((file) =>
      /\.env|config.local|server[\\/]|node_modules[\\/]/.test(file),
    ),
  );
  const knowledge = JSON.parse(
    await readFile(join(root, "server/knowledge.json"), "utf8"),
  );
  assert.equal(knowledge.projects.length, 12);
});
