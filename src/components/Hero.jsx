import { useRef } from "react";
import { useHeroEffects } from "../hooks/useHeroEffects";
export default function Hero() {
  const heroRef = useRef(null);
  useHeroEffects(heroRef);
  return (
    <section ref={heroRef} className="hero" id="top" aria-labelledby="name">
      <div className="portrait" aria-hidden="true">
        <img src="assets/images/portrait.webp" alt="" fetchPriority="high" />
      </div>
      <div className="shade" aria-hidden="true"></div>

      <div
        className="orbit"
        role="group"
        aria-label="Interactive orbital shapes"
      >
        <div className="orbital-track track-ring">
          <button
            type="button"
            className="ring"
            aria-label="Toggle orbital animation"
            aria-pressed="false"
          ></button>
        </div>
        <div className="orbital-track track-disc">
          <button
            type="button"
            className="disc"
            aria-label="Toggle orbital animation"
            aria-pressed="false"
          ></button>
        </div>
        <div className="orbital-track track-moon">
          <button
            type="button"
            className="moon"
            aria-label="Toggle orbital animation"
            aria-pressed="false"
          ></button>
        </div>
        <span className="coordinate" aria-hidden="true">
          01 / creative development
        </span>
        <span className="orbit-readout" aria-hidden="true">
          a 1.1
          <br />
          creative / development
        </span>
      </div>
      <div className="intro">
        <p className="specialties">code · create · connect</p>
        <h1 id="name">reasad azim</h1>
        <p className="role">web developer</p>
        <p className="description">
          Thoughtful code.
          <br />
          Purposeful digital experiences.
        </p>
      </div>
      <a
        className="scroll-indicator"
        href="#about"
        aria-label="Scroll to learn about me"
      >
        <span className="scroll-dot" aria-hidden="true"></span>
      </a>
      <footer className="footer flex items-center justify-between">
        <span>
          © <span id="year">{new Date().getFullYear()}</span> Reasad Azim
        </span>
        <span className="footer-label">Scroll down</span>
        <nav className="social-links" aria-label="Social profiles">
          <a
            href="https://github.com/reasadazim"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub — opens in a new tab"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.77-.24.77-.54v-2.09c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.4-1.22.72-1.5-2.5-.29-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.16-3.01-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15a10.73 10.73 0 0 1 5.6 0c2.13-1.45 3.07-1.15 3.07-1.15.62 1.55.23 2.69.12 2.98.72.78 1.15 1.78 1.15 3.01 0 4.33-2.63 5.28-5.14 5.56.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/a-m-reasad-azim-bappy-b42057a4/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn — opens in a new tab"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5.1 3.4a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0ZM1.2 7h3.6v15H1.2V7Zm6 0h3.5v2.1h.1c.5-1 1.7-2.4 4-2.4 4.2 0 5 2.7 5 6.3v9h-3.6v-8c0-1.9 0-4.3-2.6-4.3s-2.9 2-2.9 4.2V22H7.2V7Z" />
            </svg>
          </a>
        </nav>
      </footer>
    </section>
  );
}
