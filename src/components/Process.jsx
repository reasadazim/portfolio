export default function Process() {
  return (
    <section
      className="process-section section-pad"
      aria-labelledby="process-title"
    >
      <div className="section-top flex items-center justify-between gap-[24px]">
        <span className="eyebrow">05 / Working together</span>
      </div>
      <div className="section-heading flex items-end justify-between gap-[60px]">
        <h2 className="display-title" id="process-title">
          Your goals.
          <br />
          <em>Our starting point.</em>
        </h2>
        <p>
          Understanding what you need comes first.
          <br />
          The technology follows.
        </p>
      </div>
      <div className="process-grid grid grid-cols-3 gap-[44px]">
        <article>
          <span className="step-number">01 / Understand</span>
          <h3>Start with the right questions.</h3>
          <p>
            We discuss your requirements, your business goals, and what a useful
            outcome looks like for you.
          </p>
        </article>
        <article>
          <span className="step-number">02 / Build</span>
          <h3>Turn the idea into a solution.</h3>
          <p>
            I develop the website, application, or automation around the needs
            we’ve identified.
          </p>
        </article>
        <article>
          <span className="step-number">03 / Refine</span>
          <h3>Make the details work.</h3>
          <p>
            We review the result, improve the details, and make sure the
            solution meets your requirements.
          </p>
        </article>
      </div>
    </section>
  );
}
