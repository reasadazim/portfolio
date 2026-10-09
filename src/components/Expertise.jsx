import { profile } from "../data/profile";

export default function Expertise() {
  return (
    <section
      className="expertise-section section-pad"
      id="expertise"
      aria-labelledby="expertise-title"
    >
      <div className="section-top flex items-center justify-between gap-[24px]">
        <span className="eyebrow">04 / Technical expertise</span>
        <span className="eyebrow">The tools behind the work</span>
      </div>
      <div className="expertise-layout grid grid-cols-[1.2fr_1fr] gap-[9vw]">
        <div>
          <h2 className="display-title" id="expertise-title">
            A versatile toolkit.
            <br />
            <em>A practical mindset.</em>
          </h2>
          <p className="section-description">
            I choose the tools that fit your requirements, then use them to
            build a solution that supports your goals.
          </p>
          <div className="code-mark" aria-hidden="true">
            <span>{"{"}</span>
            <i></i>
            <span>{"}"}</span>
          </div>
        </div>
        <div className="stack-list">
          {profile.expertise.map((group) => (
            <div className="stack-group" key={group.title}>
              <h3>{group.title}</h3>
              <ul className="tech-tags flex flex-wrap gap-[9px] list-none m-0 p-0">
                {group.tools.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
