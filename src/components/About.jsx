import { profile } from "../data/profile.js";
import UpworkHighlights from "./UpworkHighlights.jsx";

export default function About() {
  return (
    <section
      className="about-section section-pad"
      id="about"
      aria-labelledby="about-title"
    >
      <div className="section-top flex items-center justify-between gap-[24px]">
        <span className="eyebrow">01 / A little about me</span>
        <span className="eyebrow">Experience meets curiosity</span>
      </div>
      <div className="about-layout grid grid-cols-[1.3fr_1fr] items-start gap-[9vw]">
        <h2 id="about-title" className="display-title">
          Good ideas.
          <br />
          Practical code.
          <br />
          <em>Real possibilities.</em>
        </h2>
        <div className="about-copy">
          <span className="experience-mark">
            10<span>+</span>
            <small>years of experience</small>
          </span>
          <p>
            I’m Reasad, a full-stack web developer and data scraping specialist.
            I help businesses build web applications, create professional
            websites, and turn web data into useful, structured information.
          </p>
          <p>
            Based in {profile.location}, I help with new websites, custom
            applications, improvements to existing platforms, API integrations,
            and automation. Understanding your requirements and business goals
            comes first.
          </p>
          <a className="text-link" href="#services">
            Explore what I can do <span aria-hidden="true">↘</span>
          </a>
        </div>
      </div>
      <UpworkHighlights />
      <div className="about-bottom">
        <span className="mini-orbit" aria-hidden="true">
          <i></i>
          <i></i>
        </span>
        <p>
          Built around your needs.
          <br />
          Designed for your business.
        </p>
        <span className="eyebrow">Development / Data / Automation</span>
      </div>
    </section>
  );
}
