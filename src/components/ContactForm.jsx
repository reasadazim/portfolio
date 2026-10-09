import { useEffect, useRef, useState } from "react";
import { assistantRequest } from "../lib/assistant-request.js";

const emptyMessage = { name: "", email: "", message: "", website: "" };

export default function ContactForm({ open, onClose }) {
  const dialog = useRef(null);
  const prepared = useRef(null);
  const sending = useRef(false);
  const request = useRef(null);
  const [details, setDetails] = useState(emptyMessage);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      dialog.current.close();
      return;
    }
    dialog.current.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => () => request.current?.abort(), []);

  function update(event) {
    prepared.current = null;
    setDetails((value) => ({
      ...value,
      [event.target.name]: event.target.value,
    }));
  }

  function close() {
    if (sent) setSent(false);
    onClose();
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    request.current = new AbortController();
    const timeout = setTimeout(() => request.current?.abort(), 60000);
    try {
      const status = await assistantRequest(
        null,
        null,
        {},
        request.current.signal,
      );
      if (!status.emailReady)
        throw new Error(
          "Email delivery is temporarily unavailable. Please email contact@reasadazim.com directly.",
        );
      if (!prepared.current) {
        const result = await assistantRequest(
          "prepare",
          status.csrf,
          details,
          request.current.signal,
        );
        prepared.current = result.draft;
      }
      // Clicking Send message is the visitor's explicit instruction to send this form.
      const result = await assistantRequest(
        "send",
        status.csrf,
        { draftId: prepared.current.id, consent: true },
        request.current.signal,
      );
      if (!result.sent)
        throw new Error(
          "Delivery could not be confirmed. Please email Reasad directly.",
        );
      setSent(true);
      setDetails(emptyMessage);
      prepared.current = null;
    } catch (failure) {
      if (failure.status === 403) prepared.current = null;
      setError(
        failure.name === "AbortError"
          ? "Delivery could not be confirmed. Please email Reasad directly before trying again."
          : failure.message,
      );
    } finally {
      clearTimeout(timeout);
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="contact-dialog"
      aria-labelledby="contact-form-title"
      aria-describedby="contact-form-description"
      onClose={close}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          close();
      }}
    >
      <button
        className="contact-form-close"
        type="button"
        onClick={close}
        aria-label="Close contact form"
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
      <span className="contact-form-eyebrow">LET’S START A CONVERSATION</span>
      <h2 id="contact-form-title">
        Tell me about <em>your idea.</em>
      </h2>
      <p id="contact-form-description">
        A new project, a question, or something you’d like to improve. I’d love
        to hear about it.
      </p>
      {sent ? (
        <div className="contact-form-success" role="status">
          <span aria-hidden="true">✓</span>
          <h3>Message sent.</h3>
          <p>
            Thanks for getting in touch. I’ll reply to the email address you
            provided.
          </p>
          <button type="button" className="contact-form-submit" onClick={close}>
            Done <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : (
        <form onSubmit={sendMessage}>
          <fieldset disabled={busy} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Your name"
                  minLength="2"
                  maxLength="100"
                  required
                  value={details.name}
                  onChange={update}
                  autoFocus
                />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength="254"
                  required
                  value={details.email}
                  onChange={update}
                />
              </label>
            </div>
            <label>
              Your message
              <textarea
                name="message"
                rows="5"
                placeholder="What do you have in mind?"
                minLength="10"
                maxLength="4000"
                required
                value={details.message}
                onChange={update}
              />
            </label>
            <div className="contact-form-honeypot" aria-hidden="true">
              <label>
                Website
                <input
                  name="website"
                  tabIndex="-1"
                  autoComplete="off"
                  value={details.website}
                  onChange={update}
                />
              </label>
            </div>
            {error && (
              <p className="contact-form-error" role="alert">
                {error}{" "}
                <a href="mailto:contact@reasadazim.com">Email Reasad ↗</a>
              </p>
            )}
            <div className="contact-form-actions flex flex-wrap items-center justify-between gap-4">
              <p>Your message goes directly to Reasad.</p>
              <button
                type="submit"
                className="contact-form-submit"
                disabled={busy}
              >
                {busy ? "Sending…" : "Send message"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </dialog>
  );
}
