import { useState } from "react";
import { profile } from "../data/profile.js";
import ContactForm from "./ContactForm.jsx";
export default function Contact() {
  const [formOpen, setFormOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText("contact@reasadazim.com");
      setCopyStatus("Email copied.");
    } catch {
      setCopyStatus(
        "Select the email address to copy it, or click it to send a message.",
      );
    }
  }
  return (
    <section
      className="contact-section section-pad"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="section-top flex items-center justify-between gap-[24px]">
        <span className="eyebrow">06 / Have a project in mind?</span>
        <span className="contact-orbit" aria-hidden="true"></span>
      </div>
      <h2 id="contact-title">
        Let’s build
        <br />
        something <em>useful.</em>
      </h2>
      <div className="contact-bottom">
        <p>
          A new website. A custom application. Data that makes sense.
          <br />
          Send me a message, and let’s discuss how I can help.
        </p>
        <button
          className="contact-button"
          type="button"
          onClick={() => setFormOpen(true)}
          aria-haspopup="dialog"
        >
          Send me a message <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="email-row">
        <a href="mailto:contact@reasadazim.com">contact@reasadazim.com</a>
        <button
          type="button"
          className="copy-email"
          onClick={copyEmail}
          aria-label="Copy email address"
        >
          Copy email <span aria-hidden="true">＋</span>
        </button>
        <span className="copy-status" role="status">
          {copyStatus}
        </span>
      </div>
      <a
        className="text-link"
        href={profile.upwork.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Work with me on Upwork — opens in a new tab"
      >
        Work with me on Upwork <span aria-hidden="true">↗</span>
      </a>
      <ContactForm open={formOpen} onClose={() => setFormOpen(false)} />
    </section>
  );
}
