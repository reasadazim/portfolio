import { useEffect, useRef, useState } from "react";
import { enquiryRecipient as recipient } from "../data/assistant.js";
import { useAssistantExpression } from "../hooks/useAssistantExpression.js";
import AssistantAvatar from "./AssistantAvatar.jsx";
import { assistantRequest } from "../lib/assistant-request.js";

const emptyEnquiry = { name: "", email: "", message: "", website: "" };

export default function Assistant() {
  const [launcherHovered, setLauncherHovered] = useState(false);
  const [launcherClicked, setLauncherClicked] = useState(false);
  const expression = useAssistantExpression(launcherHovered || launcherClicked);
  const excitementTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [enquiryMode, setEnquiryMode] = useState(null);
  const [enquiry, setEnquiry] = useState(emptyEnquiry);
  const [draft, setDraft] = useState(null);
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const launcher = useRef(null);
  const closeButton = useRef(null);
  const transcript = useRef(null);
  const requestLock = useRef(false);
  const controller = useRef(null);

  useEffect(
    () => () => {
      controller.current?.abort();
      clearTimeout(excitementTimer.current);
    },
    [],
  );

  async function perform(work) {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 100000);
    try {
      await work(controller.current.signal);
    } catch (failure) {
      if (failure.status === 403) setSession(null);
      setError(
        failure.name === "AbortError"
          ? "The request took too long. Please try again or email Reasad directly."
          : failure.message,
      );
    } finally {
      clearTimeout(timeout);
      requestLock.current = false;
      setBusy(false);
    }
  }

  function showDraft(value) {
    setDraft(value);
    setEnquiry({
      name: value.name,
      email: value.email,
      message: value.message,
      website: "",
    });
    setConsent(false);
    setSent(false);
    setEnquiryMode("review");
  }

  function loadSession() {
    return perform(async (signal) => {
      const result = await assistantRequest(null, null, {}, signal);
      setSession(result);
      setMessages(result.history || []);
      if (result.draft) showDraft(result.draft);
    });
  }

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
    if (!session && !requestLock.current) loadSession();
    function closeOnEscape(event) {
      if (event.key === "Escape") closeChat();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
    // Load once when opened; subsequent openings keep the conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages, busy, enquiryMode, error, sent]);

  function closeChat() {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  }

  async function ask(text = question) {
    const message = text.trim();
    if (!message || !session?.aiReady || requestLock.current) return;
    await perform(async (signal) => {
      setMessages((previous) => [
        ...previous,
        { role: "user", content: message },
      ]);
      try {
        const result = await assistantRequest(
          "chat",
          session.csrf,
          { message },
          signal,
        );
        setMessages((previous) => [
          ...previous,
          { role: "assistant", content: result.reply },
        ]);
        setQuestion("");
        if (result.enquiryRequested) writeEnquiry();
      } catch (failure) {
        setMessages((previous) => previous.slice(0, -1));
        setQuestion(message);
        throw failure;
      }
    });
  }

  function writeEnquiry() {
    setSent(false);
    setConsent(false);
    setError("");
    setEnquiryMode("edit");
  }

  function prepareEnquiry(event) {
    event.preventDefault();
    perform(async (signal) => {
      const result = await assistantRequest(
        "prepare",
        session.csrf,
        enquiry,
        signal,
      );
      showDraft(result.draft);
    });
  }

  function sendEnquiry() {
    if (!consent || !draft) return;
    perform(async (signal) => {
      const result = await assistantRequest(
        "send",
        session.csrf,
        { draftId: draft.id, consent: true },
        signal,
      );
      if (result.sent) {
        setSent(true);
        setDraft(null);
        setEnquiry(emptyEnquiry);
        setEnquiryMode(null);
        setConsent(false);
      }
    });
  }

  function resetChat() {
    perform(async (signal) => {
      await assistantRequest("reset", session.csrf, {}, signal);
      setMessages([]);
      setDraft(null);
      setEnquiry(emptyEnquiry);
      setEnquiryMode(null);
      setSent(false);
    });
  }

  const mailLink = `mailto:${recipient}?subject=${encodeURIComponent("Portfolio project enquiry")}&body=${encodeURIComponent(`Name: ${enquiry.name}\nReply email: ${enquiry.email}\n\n${enquiry.message}`)}`;

  return (
    <aside className="assistant-widget" aria-label="Portfolio assistant">
      {open && (
        <section
          className="assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="assistant-title"
          id="portfolio-chat"
        >
          <header className="assistant-heading flex items-center gap-3">
            <AssistantAvatar expression={expression} small />
            <div className="assistant-heading-copy">
              <h2 id="assistant-title">Reasad’s assistant</h2>
              <p>Ask a question. Start a conversation.</p>
            </div>
            <button
              ref={closeButton}
              className="assistant-icon-button"
              type="button"
              aria-label="Close chat"
              onClick={closeChat}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div className="assistant-transcript" ref={transcript}>
            <div className="assistant-bubble assistant-reply">
              Hi! I’m Reasad’s AI assistant. Ask me about his services,
              experience, or projects. I can also help you prepare a project
              enquiry.
            </div>
            {!session && !busy && (
              <button
                className="assistant-text-button"
                type="button"
                onClick={loadSession}
              >
                Reconnect assistant
              </button>
            )}
            {session && !session.aiReady && (
              <p className="assistant-notice">
                AI chat is currently offline. You can still write an enquiry to
                Reasad.
              </p>
            )}
            <div
              className="assistant-messages"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`assistant-bubble ${message.role === "user" ? "assistant-question" : "assistant-reply"}`}
                >
                  <span className="assistant-speaker">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  {message.content}
                </div>
              ))}
            </div>
            {enquiryMode === "edit" && (
              <form className="assistant-enquiry" onSubmit={prepareEnquiry}>
                <h3>Tell Reasad about your project</h3>
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    minLength="2"
                    maxLength="100"
                    required
                    value={enquiry.name}
                    onChange={(event) =>
                      setEnquiry({ ...enquiry, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength="254"
                    required
                    value={enquiry.email}
                    onChange={(event) =>
                      setEnquiry({ ...enquiry, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  Project details
                  <textarea
                    name="message"
                    rows="4"
                    minLength="10"
                    maxLength="4000"
                    required
                    value={enquiry.message}
                    onChange={(event) =>
                      setEnquiry({ ...enquiry, message: event.target.value })
                    }
                  />
                </label>
                <div className="assistant-honeypot" aria-hidden="true">
                  <label>
                    Website
                    <input
                      name="website"
                      tabIndex="-1"
                      autoComplete="off"
                      value={enquiry.website}
                      onChange={(event) =>
                        setEnquiry({ ...enquiry, website: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="assistant-form-actions flex items-center gap-3">
                  <button
                    className="assistant-primary"
                    type="submit"
                    disabled={busy || !session}
                  >
                    Review enquiry
                  </button>
                  <button
                    className="assistant-text-button"
                    type="button"
                    disabled={busy}
                    onClick={() => setEnquiryMode(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {enquiryMode === "review" && draft && (
              <div className="assistant-review">
                <h3>Review your enquiry</h3>
                <p className="assistant-recipient">To: {recipient}</p>
                <p>
                  <strong>{draft.name}</strong>
                  <br />
                  {draft.email}
                </p>
                <p className="assistant-draft-text">{draft.message}</p>
                {session?.emailReady ? (
                  <>
                    <label className="assistant-consent">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                      />
                      I approve sending these details to Reasad by email.
                    </label>
                    <button
                      className="assistant-primary"
                      type="button"
                      disabled={busy || !consent}
                      onClick={sendEnquiry}
                    >
                      Send enquiry <span aria-hidden="true">↗</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="assistant-notice">
                      Email delivery is currently offline. Open your email app
                      to send this enquiry.
                    </p>
                    <a className="assistant-primary" href={mailLink}>
                      Open email app <span aria-hidden="true">↗</span>
                    </a>
                  </>
                )}
                <button
                  className="assistant-text-button assistant-edit"
                  type="button"
                  disabled={busy}
                  onClick={writeEnquiry}
                >
                  Edit details
                </button>
              </div>
            )}
            {sent && (
              <p className="assistant-success" role="status">
                Your enquiry was sent to Reasad. He can reply to the email
                address you provided.
              </p>
            )}
            {busy && (
              <p className="assistant-working" role="status">
                <span aria-hidden="true">● ● ●</span>{" "}
                {session ? "One moment…" : "Connecting…"}
              </p>
            )}
            {error && (
              <p className="assistant-error" role="alert">
                {error} <a href={`mailto:${recipient}`}>Email Reasad</a>
              </p>
            )}
          </div>
          <div className="assistant-bottom">
            <div className="assistant-tools flex items-center justify-between gap-3">
              <button
                className="assistant-text-button"
                type="button"
                disabled={busy || !session}
                onClick={writeEnquiry}
              >
                Send an enquiry <span aria-hidden="true">↗</span>
              </button>
              <button
                className="assistant-text-button"
                type="button"
                disabled={busy || !session || (!messages.length && !draft)}
                onClick={resetChat}
              >
                New chat
              </button>
            </div>
            <form
              className="assistant-compose flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                ask();
              }}
            >
              <textarea
                aria-label="Your question"
                rows="2"
                placeholder={
                  session?.aiReady
                    ? "Ask about a project…"
                    : "AI chat is currently offline"
                }
                maxLength="2000"
                value={question}
                disabled={!session?.aiReady || busy}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    ask();
                  }
                }}
              />
              <button
                className="assistant-send"
                type="submit"
                aria-label="Send question"
                disabled={busy || !session?.aiReady || !question.trim()}
              >
                ↑
              </button>
            </form>
          </div>
        </section>
      )}
      <button
        ref={launcher}
        className="assistant-launcher"
        type="button"
        aria-label={open ? "Close assistant" : "Open Reasad’s AI assistant"}
        aria-expanded={open}
        aria-controls="portfolio-chat"
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") setLauncherHovered(true);
        }}
        onPointerLeave={() => setLauncherHovered(false)}
        onPointerCancel={() => setLauncherHovered(false)}
        onClick={() => {
          setLauncherClicked(true);
          clearTimeout(excitementTimer.current);
          excitementTimer.current = setTimeout(
            () => setLauncherClicked(false),
            3000,
          );
          if (open) closeChat();
          else setOpen(true);
        }}
      >
        <span className="assistant-launcher-label">Let’s chat</span>
        <AssistantAvatar expression={expression} />
      </button>
    </aside>
  );
}
