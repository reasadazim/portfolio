import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";

const root = fileURLToPath(new URL("../", import.meta.url));
const details = {
  name: "Visitor Example",
  email: "visitor@example.test",
  message: "I need a Laravel application with an API integration.",
};
function fixture(operation, extra = {}) {
  const result = spawnSync("php", ["tests/assistant-fixture.php"], {
    cwd: root,
    input: JSON.stringify({ operation, ...extra }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
const response = (parts, finishReason = "STOP") => ({
  candidates: [{ content: { role: "model", parts }, finishReason }],
});
const reply = (text) => response([{ text }]);

test("enquiries validate Unicode names, reject header injection and invalid field types", () => {
  assert.equal(
    fixture("validate", { details: { ...details, name: "রিয়াসাদ" } }).name,
    "রিয়াসাদ",
  );
  for (const invalid of [
    { email: "visitor@example.test\r\nBcc: attacker@example.test" },
    { name: "X\nBcc" },
    { message: "short" },
    { name: [] },
    { email: "invalid" },
  ]) {
    assert.equal(
      fixture("validate", { details: { ...details, ...invalid } }).status,
      400,
    );
  }
});

test("agent uses Gemini roles, bounded history, public facts, and a private-form-only tool", () => {
  const history = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: "Earlier question",
  }));
  const result = fixture("agent", {
    message: "What services are available?",
    history,
    responses: [reply("Reasad builds web applications.")],
  });
  assert.equal(result.reply, "Reasad builds web applications.");
  assert.equal(result.history.length, 16);
  const payload = result.requests[0];
  assert.equal(payload.contents.length, 17);
  assert.equal(payload.contents[1].role, "model");
  assert.equal(payload.contents.at(-1).role, "user");
  assert.match(payload.systemInstruction.parts[0].text, /PORTFOLIO FACTS/);
  assert.match(
    payload.systemInstruction.parts[0].text,
    /Never ask for personal or confidential/,
  );
  assert.equal(
    payload.tools[0].functionDeclarations[0].name,
    "open_enquiry_form",
  );
  assert.equal(payload.tools[0].functionDeclarations[0].parameters, undefined);
  assert.equal(payload.toolConfig.functionCallingConfig.mode, "AUTO");
  assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel, "LOW");
  assert.equal(result.enquiryRequested, false);
});

test("Gemini tool opens the private form and preserves thought signatures and call IDs", () => {
  const call = { name: "open_enquiry_form", id: "call_enquiry_1", args: {} };
  const model = response([
    { functionCall: call, thoughtSignature: "opaque-signature" },
  ]);
  const result = fixture("agent", {
    message: "I want to contact Reasad",
    responses: [model, reply("Please fill in the private enquiry form below.")],
  });
  assert.equal(result.enquiryRequested, true);
  assert.equal(result.draft, undefined);
  assert.equal(result.requests.length, 2);
  assert.equal(
    result.requests[1].toolConfig.functionCallingConfig.mode,
    "NONE",
  );
  assert.deepEqual(
    result.requests[1].contents.at(-2),
    model.candidates[0].content,
  );
  const output = result.requests[1].contents.at(-1);
  assert.equal(output.role, "user");
  assert.equal(output.parts[0].functionResponse.id, call.id);
  assert.equal(output.parts[0].functionResponse.name, call.name);
  assert.equal(output.parts[0].functionResponse.response.email_sent, false);
  assert.equal(output.parts[0].functionResponse.response.status, "form_opened");
});

test("unsupported tools or arguments cannot send email or collect contact details", () => {
  for (const call of [
    { name: "send_email", args: details },
    { name: "open_enquiry_form", args: "not an object" },
    { name: "open_enquiry_form", args: details },
  ]) {
    const result = fixture("agent", {
      message: "Contact Reasad",
      responses: [
        response([{ functionCall: { id: "call_invalid", ...call } }]),
        reply("Please use the enquiry form."),
      ],
    });
    assert.equal(result.enquiryRequested, false);
    assert.equal(
      result.requests[1].contents.at(-1).parts[0].functionResponse.response
        .status,
      "invalid_tool",
    );
  }
});

test("blocked, truncated, empty, and repeated tool responses fail without rendering thoughts", () => {
  for (const invalid of [
    { promptFeedback: { blockReason: "SAFETY" } },
    response([{ text: "Partial answer" }], "MAX_TOKENS"),
    response([]),
  ]) {
    assert.equal(
      fixture("agent", { message: "Hello", responses: [invalid] }).status,
      503,
    );
  }
  const thought = fixture("agent", {
    message: "Hello",
    responses: [
      response([
        { text: "Private reasoning", thought: true },
        { text: "Visible reply" },
      ]),
    ],
  });
  assert.equal(thought.reply, "Visible reply");
  const tool = response([
    { functionCall: { name: "open_enquiry_form", args: {} } },
  ]);
  assert.equal(
    fixture("agent", { message: "Contact Reasad", responses: [tool, tool] })
      .status,
    503,
  );
});

test("common contact details and secrets are rejected before making Gemini requests", () => {
  for (const message of [
    "Email me at visitor@example.test",
    "Call +880 1712345678",
    "My api_key=private-value",
  ]) {
    assert.equal(fixture("agent", { message, responses: [] }).status, 400);
  }
  assert.equal(
    fixture("agent", {
      message: "Hello",
      history: [{ role: "user", content: "visitor@example.test" }],
      responses: [],
    }).status,
    400,
  );
});

test("mailer fixes the recipient, uses the verified sender and visitor Reply-To, and sends plain text", () => {
  const result = fixture("mailer", {
    details: { ...details, recipient: "attacker@example.test" },
  });
  assert.equal(result.to[0][0], "riasadazim@gmail.com");
  assert.equal(result.from, "sender@example.test");
  assert.equal(result.replyTo[0][0], details.email);
  assert.equal(result.html, "text/plain");
  assert.match(result.body, /visitor reviewed and approved/);
});

test("request limits survive repeated requests", () => {
  assert.equal(fixture("limit").status, 429);
});

test("HTTP endpoint protects sessions, consent, drafts, origins, and private files", async () => {
  const server = spawn("php", ["-S", "127.0.0.1:8094", "server/router.php"], {
    cwd: root,
    stdio: "ignore",
  });
  const url = "http://127.0.0.1:8094/api/assistant.php";
  try {
    let initial;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        initial = await fetch(url);
        break;
      } catch {
        await delay(100);
      }
    }
    assert.ok(initial, "PHP API server started");
    assert.equal(initial.status, 200);
    const cookie = initial.headers.get("set-cookie").split(";")[0];
    assert.match(initial.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(initial.headers.get("set-cookie"), /SameSite=Strict/i);
    const status = await initial.json();
    const post = (body, origin = "http://127.0.0.1:8091") =>
      fetch(url, {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csrf: status.csrf, ...body }),
      });
    assert.equal(
      (
        await post(
          { action: "prepare", ...details },
          "https://attacker.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (await post({ action: "prepare", ...details, csrf: "wrong" })).status,
      403,
    );
    assert.equal(
      (await post({ action: "send", draftId: "missing", consent: true }))
        .status,
      400,
    );
    const draft = (
      await (
        await post({
          action: "prepare",
          ...details,
          recipient: "attacker@example.test",
        })
      ).json()
    ).draft;
    assert.equal(draft.recipient, "riasadazim@gmail.com");
    assert.equal(
      (await post({ action: "send", draftId: draft.id, consent: false }))
        .status,
      400,
    );
    // Never make a live AI request or send a real email during tests.
    if (!status.emailReady)
      assert.equal(
        (await post({ action: "send", draftId: draft.id, consent: true }))
          .status,
        503,
      );
    assert.equal(
      (await post({ action: "chat", message: "visitor@example.test" })).status,
      400,
    );
    if (!status.aiReady)
      assert.equal(
        (await post({ action: "chat", message: "Hello" })).status,
        503,
      );
    assert.equal((await post({ action: "reset" })).status, 200);
    assert.equal(
      (await post({ action: "send", draftId: draft.id, consent: true })).status,
      400,
    );
    assert.equal(
      (await post({ action: "prepare", ...details, website: "spam" })).status,
      400,
    );
    assert.equal(
      (
        await post({
          action: "prepare",
          ...details,
          message: "x".repeat(25000),
        })
      ).status,
      413,
    );
    for (const path of [
      "/server/config.local.php",
      "/server/knowledge.json",
      "/server/vendor/autoload.php",
    ])
      assert.equal((await fetch(`http://127.0.0.1:8094${path}`)).status, 404);
  } finally {
    server.kill();
  }
});

test("production assets contain no private config, vendor directory, or API key", () => {
  const files = readdirSync(`${root}dist`, { recursive: true });
  assert.ok(
    files.includes("api\\assistant.php") || files.includes("api/assistant.php"),
  );
  assert.ok(
    !files.some((file) => /config.local|server[\\/]|vendor[\\/]/.test(file)),
  );
  const knowledge = JSON.parse(
    readFileSync(`${root}server/knowledge.json`, "utf8"),
  );
  assert.equal(knowledge.projects.length, 12);
  assert.ok(
    knowledge.expertise
      .find((group) => group.title === "Cloud & hosting")
      .tools.includes("AWS"),
  );
});
