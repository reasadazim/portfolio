import { profile } from "../data/profile.js";

const reviewDate = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default function UpworkHighlights() {
  const { upwork } = profile;
  return (
    <div
      id="upwork"
      className="upwork-highlights mt-16 border-t border-[var(--line)] pt-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="m-0 text-xl font-medium tracking-tight">
          Trusted by clients on Upwork.
        </h3>
        <a
          className="text-link !mt-0"
          href={upwork.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View my Upwork profile — opens in a new tab"
        >
          View my Upwork profile <span aria-hidden="true">↗</span>
        </a>
      </div>
      <dl className="my-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-5">
        {upwork.stats.map(({ value, label }) => (
          <div key={label}>
            <dt className="eyebrow mb-3 text-[#a6a39f]">{label}</dt>
            <dd className="m-0 text-[clamp(25px,2.6vw,40px)] leading-tight tracking-tight text-[var(--section-accent)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div
        className="grid grid-cols-1 gap-8 md:grid-cols-2"
        aria-label="Client testimonials"
      >
        {upwork.testimonials.map((feedback) => (
          <figure
            key={`${feedback.client}-${feedback.date}`}
            className="m-0 flex flex-col border-l-2 border-[var(--section-accent)] pl-6"
          >
            <span className="eyebrow mb-3 text-[var(--section-accent)]">
              {feedback.rating} on Upwork
            </span>
            {feedback.quote ? (
              <blockquote className="m-0 text-lg leading-relaxed text-[var(--paper)]">
                “{feedback.quote}”
              </blockquote>
            ) : (
              <div>
                <p className="m-0 text-lg leading-relaxed text-[var(--paper)]">
                  {feedback.summary}
                </p>
                <span className="mt-2 block text-[10px] text-[#a6a39f]">
                  Client feedback summary
                </span>
              </div>
            )}
            <figcaption className="mt-auto pt-5 text-xs leading-relaxed text-[#a6a39f]">
              <span className="block font-medium text-[var(--paper)]">
                {feedback.client}
              </span>
              {feedback.project}
              <time className="mt-1 block" dateTime={feedback.date}>
                {reviewDate.format(new Date(feedback.date))}
              </time>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mb-0 mt-6 text-xs text-[#a6a39f]">
        Profile figures checked on{" "}
        <time dateTime={upwork.checkedAt}>October 9, 2026</time>.
      </p>
    </div>
  );
}
